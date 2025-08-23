import { Request, Response } from 'express';
import { SpanStatusCode } from '@opentelemetry/api';
import { IWebCrawlPort } from '../../../application/ports/web-crawl.port';
import { IMetricsPort } from '../../../infrastructure/ports/metrics.port';
import { WebCrawlRequestDto } from '../dtos/web-crawl-request.dto';
import { WebCrawlResponseDto } from '../dtos/web-crawl-response.dto';
import { TraceContextUtils } from '../../../common/utils/trace-context.utils';
import { logger } from '../../../common/utils/logger';

/**
 * Handler for web crawl REST API endpoints
 * Manages HTTP requests for web crawl operations
 */
export class WebCrawlHandler {
  constructor(
    private readonly webCrawlService: IWebCrawlPort,
    private readonly metrics: IMetricsPort
  ) {}

  /**
   * Handle POST /api/web-crawl endpoint
   */
  public async handleWebCrawlRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    // Get or create trace context
    let traceContext: any;
    
    if ((req as any).traceContext) {
      traceContext = (req as any).traceContext;
    } else {
      const result = TraceContextUtils.createTraceContext();
      traceContext = result.traceContext;
    }
    
    try {
      // Create the main handle span first
      const handleSpan = TraceContextUtils.createChildSpan('handle-web-crawl-request', {
        'business.operation': 'handle_web_crawl_request',
        'http.method': req.method,
        'http.url': req.url,
      });

      // Set initial status to OK
      handleSpan.setStatus({ code: SpanStatusCode.OK });

      try {
        // Validate request body
        const requestDto = req.body as WebCrawlRequestDto;

        logger.info('Received web crawl request', {
          userEmail: requestDto.userEmail,
          query: requestDto.query,
          originalUrl: requestDto.originalUrl,
          traceparent: traceContext.traceparent,
        });

        // Process the request with submit span as child of handle span
        const result = await TraceContextUtils.withSpanWithParent(
          'submit-web-crawl-request',
          async (submitSpan) => {
            // Publish task to external system with publish span as child of submit span
            return await TraceContextUtils.withSpanWithParent(
              'publish-kafka-task',
              async (publishSpan) => {
                return await this.webCrawlService.submitWebCrawlRequest(
                  requestDto.userEmail,
                  requestDto.query,
                  requestDto.originalUrl,
                  traceContext
                );
              },
              submitSpan,
              {
                'business.operation': 'publish_kafka_task',
                'messaging.kafka.topic': 'task-status',
                'business.user_email': requestDto.userEmail,
              }
            );
          },
          handleSpan,
          {
            'business.operation': 'submit_web_crawl_request',
            'business.user_email': requestDto.userEmail,
            'business.query': requestDto.query,
            'business.original_url': requestDto.originalUrl,
          }
        );

        // Create response DTO
        const responseDto: WebCrawlResponseDto = {
          message: result.message,
          status: result.status,
        };

        // Record metrics
        const duration = Date.now() - startTime;
        this.metrics.incrementRequestCounter('/api/web-crawl', 'POST', 200);
        this.metrics.recordRequestDuration('/api/web-crawl', 'POST', duration);

        // Send response
        res.status(200).json(responseDto);

        logger.info('Web crawl request processed successfully', {
          userEmail: requestDto.userEmail,
          duration,
          traceparent: traceContext.traceparent,
        });

        // End handle span with success
        TraceContextUtils.endSpan(handleSpan, SpanStatusCode.OK);
      } catch (error) {
        // End handle span with error
        TraceContextUtils.recordException(handleSpan, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error instanceof Error && error.message.includes('Validation') ? 400 : 500;
      
      // Record error metrics
      this.metrics.incrementRequestCounter('/api/web-crawl', 'POST', statusCode);
      this.metrics.recordRequestDuration('/api/web-crawl', 'POST', duration);

      logger.error('Failed to process web crawl request', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        traceparent: (req as any).traceContext?.traceparent,
      });

      // Send error response
      res.status(statusCode).json({
        success: false,
        message: 'Failed to process web crawl request',
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}

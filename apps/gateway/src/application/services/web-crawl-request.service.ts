import { IWebCrawlPort } from '../ports/web-crawl.port';
import { IWebCrawlTaskPublisherPort } from '../../infrastructure/ports/web-crawl-task-publisher.port';
import { IMetricsPort } from '../../infrastructure/ports/metrics.port';
import { WebCrawlRequest } from '../../domain/entities/web-crawl-request.entity';
import { TraceContext } from '../../common/types/trace-context.type';
import { logger } from '../../common/utils/logger';
import { TraceContextUtils } from '../../common/utils/trace-context.utils';
import { SpanStatusCode } from '@opentelemetry/api';

/**
 * Application service for web crawl operations
 * Orchestrates the business logic for web crawl requests
 */
export class WebCrawlService implements IWebCrawlPort {
  constructor(
    private readonly taskPublisher: IWebCrawlTaskPublisherPort,
    private readonly metrics: IMetricsPort
  ) {}

  /**
   * Submit a new web crawl request
   */
  public async submitWebCrawlRequest(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<{ message: string; status: string }> {
    const startTime = Date.now();
    const span = TraceContextUtils.createChildSpan('submit-web-crawl-request', {
      'business.operation': 'submit_web_crawl_request',
      'business.user_email': userEmail,
      'business.query': query,
      'business.original_url': originalUrl,
    });

    try {
      logger.info('Processing web crawl request', {
        userEmail,
        query,
        originalUrl,
        traceparent: traceContext.traceparent,
      });

      // Create domain entity
      const webCrawlRequest = WebCrawlRequest.create(userEmail, query, originalUrl);

      // Publish task to external system
      await this.taskPublisher.publishNewTask(
        userEmail,
        query,
        originalUrl,
        traceContext
      );

      // Record metrics
      this.metrics.incrementWebCrawlRequestCounter();
      const processingTime = Date.now() - startTime;
      this.metrics.recordWebCrawlProcessingTime(processingTime);

      logger.info('Web crawl request submitted successfully', {
        taskId: webCrawlRequest.id,
        userEmail,
        processingTime,
        traceparent: traceContext.traceparent,
      });

      TraceContextUtils.endSpan(span, SpanStatusCode.OK);

      return {
        message: 'Web crawl task received successfully',
        status: 'accepted',
      };
    } catch (error) {
      logger.error('Failed to submit web crawl request', {
        userEmail,
        query,
        originalUrl,
        error: error instanceof Error ? error.message : String(error),
        traceparent: traceContext.traceparent,
      });

      TraceContextUtils.recordException(span, error instanceof Error ? error : new Error(String(error)));

      throw error;
    }
  }
}

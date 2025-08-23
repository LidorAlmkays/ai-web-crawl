# Job 10: API Handlers

## Objective
Implement REST API handlers that manage HTTP requests, trace context, validation, error handling, and coordinate with application services.

## Prerequisites
- Job 9: API DTOs completed
- DTOs with validation working
- Application services available
- Trace context utilities ready

## Inputs
- Validated DTOs
- Application services
- Trace context management
- Error handling requirements

## Detailed Implementation Steps

### Step 1: Create Web Crawl Handler
```typescript
// src/api/rest/handlers/web-crawl.handler.ts
import { Request, Response } from 'express';
import { SpanStatusCode } from '@opentelemetry/api';
import { IWebCrawlRequestPort } from '../../../application/ports/web-crawl-request.port';
import { IMetricsPort } from '../../../application/ports/metrics.port';
import { WebCrawlRequestDto } from '../dtos/web-crawl-request.dto';
import { WebCrawlResponseDto } from '../dtos/web-crawl-response.dto';
import { TraceContextUtils } from '../../../common/utils/trace-context.utils';
import { logger } from '../../../common/utils/logger';

export class WebCrawlHandler {
  constructor(
    private readonly webCrawlRequestService: IWebCrawlRequestPort,
    private readonly metrics: IMetricsPort
  ) {}

  async handleWebCrawlRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const traceContext = TraceContextUtils.extractFromHeaders(req.headers);
    const span = TraceContextUtils.createChildSpan('handle-web-crawl-request');

    try {
      // DTO should be validated by middleware
      const dto = req.body as WebCrawlRequestDto;
      
      logger.info('Processing web crawl request', {
        userEmail: dto.userEmail,
        query: dto.query,
        originalUrl: dto.originalUrl,
        traceparent: traceContext.traceparent,
      });

      // Call application service
      const result = await this.webCrawlRequestService.submitWebCrawlRequest(
        dto.userEmail,
        dto.query,
        dto.originalUrl,
        traceContext
      );

      // Create response DTO
      const response: WebCrawlResponseDto = {
        message: result.message,
        status: result.status,
      };

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordRequestDuration('/api/web-crawl', 'POST', duration);

      // Send response
      res.status(202).json(response);

      TraceContextUtils.endSpan(span, SpanStatusCode.OK);
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error instanceof Error && error.message.includes('Validation') ? 400 : 500;
      
      logger.error('Error processing web crawl request', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        traceparent: traceContext.traceparent,
      });

      this.metrics.recordRequestDuration('/api/web-crawl', 'POST', duration);
      TraceContextUtils.recordException(span, error instanceof Error ? error : new Error(String(error)));

      const errorResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path,
      };

      res.status(statusCode).json(errorResponse);
    }
  }
}
```

### Step 2: Create Health Check Handler
```typescript
// src/api/rest/handlers/health-check.handler.ts
import { Request, Response } from 'express';
import { HealthCheckResponseDto } from '../dtos/health-check.dto';
import { logger } from '../../../common/utils/logger';

export class HealthCheckHandler {
  async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const response: HealthCheckResponseDto = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          service: 'gateway',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.APP_VERSION || '1.0.0',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Health check failed', { error });
      
      const errorResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      res.status(503).json(errorResponse);
    }
  }
}
```

### Step 3: Create Error Handler
```typescript
// src/api/rest/handlers/error.handler.ts
import { Request, Response, NextFunction } from 'express';
import { ErrorResponseDto } from '../dtos/error-response.dto';
import { logger } from '../../../common/utils/logger';

export class ErrorHandler {
  static handleNotFound(req: Request, res: Response): void {
    const response: ErrorResponseDto = {
      message: 'Endpoint not found',
      error: 'Not Found',
      timestamp: new Date().toISOString(),
      path: req.path,
    };

    res.status(404).json(response);
  }

  static handleInternalError(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    const response: ErrorResponseDto = {
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: req.path,
    };

    res.status(500).json(response);
  }
}
```

### Step 4: Create Base Handler
```typescript
// src/api/rest/handlers/base.handler.ts
import { Request, Response } from 'express';
import { TraceContextUtils } from '../../../common/utils/trace-context.utils';
import { logger } from '../../../common/utils/logger';

export abstract class BaseHandler {
  protected extractTraceContext(req: Request) {
    return TraceContextUtils.extractFromHeaders(req.headers);
  }

  protected logRequest(req: Request, additionalData?: any) {
    logger.info('HTTP request received', {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ...additionalData,
    });
  }

  protected sendErrorResponse(
    res: Response,
    statusCode: number,
    message: string,
    path: string,
    details?: string[]
  ) {
    const response = {
      success: false,
      message,
      error: this.getErrorNameFromStatusCode(statusCode),
      details,
      timestamp: new Date().toISOString(),
      path,
    };

    res.status(statusCode).json(response);
  }

  private getErrorNameFromStatusCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 422: return 'Unprocessable Entity';
      case 500: return 'Internal Server Error';
      case 503: return 'Service Unavailable';
      default: return 'Error';
    }
  }
}
```

### Step 5: Create Index Export
```typescript
// src/api/rest/handlers/index.ts
export * from './web-crawl.handler';
export * from './health-check.handler';
export * from './error.handler';
export * from './base.handler';
```

## Outputs
- `src/api/rest/handlers/web-crawl.handler.ts`
- `src/api/rest/handlers/health-check.handler.ts`
- `src/api/rest/handlers/error.handler.ts`
- `src/api/rest/handlers/base.handler.ts`
- `src/api/rest/handlers/index.ts`
- Complete HTTP request handling

## Testing Criteria

### Unit Tests
- [ ] Handler creation with dependencies
- [ ] Valid request processing
- [ ] Invalid request handling
- [ ] Error scenarios
- [ ] Trace context extraction
- [ ] Response formatting

### Integration Tests
- [ ] End-to-end request flow
- [ ] Validation middleware integration
- [ ] Application service integration
- [ ] Error propagation
- [ ] Metrics recording
- [ ] Trace context propagation

### HTTP Tests
- [ ] Correct HTTP status codes
- [ ] Response format consistency
- [ ] Error response structure
- [ ] Content-Type headers
- [ ] Request/response timing

### Error Handling Tests
- [ ] Validation errors → 400
- [ ] Business logic errors → 422
- [ ] Internal errors → 500
- [ ] Service unavailable → 503
- [ ] Not found → 404

## Performance Requirements
- Request handling: < 20ms (excluding business logic)
- Memory usage: < 5MB per handler
- Concurrent request support: 100+
- Error handling overhead: < 1ms

## Error Handling
- Validation errors → structured error response
- Business logic errors → appropriate HTTP status
- Unexpected errors → 500 with logging
- Timeout errors → 503 with retry headers
- Authentication errors → 401 with proper headers

## Success Criteria
- [ ] All handlers implemented correctly
- [ ] HTTP status codes appropriate
- [ ] Error handling comprehensive
- [ ] Trace context managed properly
- [ ] Performance requirements met
- [ ] Response formats consistent
- [ ] Integration with services works
- [ ] Logging is adequate
- [ ] Metrics are recorded

## Rollback Plan
If implementation fails:
1. Remove handler files
2. Revert router integration
3. Document HTTP handling issues
4. Fix service integration problems

## Notes
- Follow REST conventions for status codes
- Ensure proper error response structure
- Maintain trace context throughout request
- Log all important events
- Handle all error scenarios gracefully
- Use consistent response formats
- Add proper type safety
- Consider async error handling patterns

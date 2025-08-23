# Job 11: API Router

## Objective
Create REST router with comprehensive middleware setup, endpoint registration, error handling, request logging, and metrics integration.

## Prerequisites
- Job 10: API Handlers completed
- All handlers implemented and tested
- Validation middleware working
- Error handling ready

## Inputs
- Implemented handlers
- Validation middleware
- Error handling middleware
- Metrics integration
- CORS requirements

## Detailed Implementation Steps

### Step 1: Create REST Router
```typescript
// src/api/rest/rest.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { WebCrawlHandler } from './handlers/web-crawl.handler';
import { HealthCheckHandler } from './handlers/health-check.handler';
import { ErrorHandler } from './handlers/error.handler';
import { createValidationMiddleware } from '../../common/utils/validation';
import { WebCrawlRequestDto } from './dtos/web-crawl-request.dto';
import { logger } from '../../common/utils/logger';
import { IMetricsPort } from '../../application/ports/metrics.port';

export class RestRouter {
  private readonly router: Router;

  constructor(
    private readonly webCrawlHandler: WebCrawlHandler,
    private readonly healthCheckHandler: HealthCheckHandler,
    private readonly metrics: IMetricsPort
  ) {
    this.router = Router();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Request logging middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      logger.info('HTTP request received', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('HTTP request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });

        // Record general metrics
        this.metrics.incrementRequestCounter(req.path, req.method, res.statusCode);
        this.metrics.recordRequestDuration(req.path, req.method, duration);
      });

      next();
    });

    // CORS middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, traceparent, tracestate');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Security headers middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      this.healthCheckHandler.handleHealthCheck(req, res);
    });

    // Web crawl endpoint with validation
    this.router.post(
      '/api/web-crawl',
      createValidationMiddleware(WebCrawlRequestDto),
      (req: Request, res: Response) => {
        this.webCrawlHandler.handleWebCrawlRequest(req, res);
      }
    );

    // API info endpoint
    this.router.get('/api/info', (req: Request, res: Response) => {
      res.json({
        service: 'gateway',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: [
          'GET /health',
          'POST /api/web-crawl',
          'GET /api/info',
          'GET /metrics',
        ],
      });
    });

    logger.info('REST routes configured', {
      endpoints: ['/health', '/api/web-crawl', '/api/info'],
    });
  }

  private setupErrorHandling(): void {
    // 404 handler for unmatched routes
    this.router.use('*', (req: Request, res: Response) => {
      ErrorHandler.handleNotFound(req, res);
    });

    // Global error handler
    this.router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      ErrorHandler.handleInternalError(error, req, res, next);
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
```

### Step 2: Create Rate Limiting Middleware
```typescript
// src/common/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export class RateLimitMiddleware {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private options: RateLimitOptions) {
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.options.windowMs);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.options.keyGenerator ? this.options.keyGenerator(req) : req.ip;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    let requestData = this.requests.get(key);
    
    if (!requestData || requestData.resetTime <= windowStart) {
      requestData = { count: 0, resetTime: now + this.options.windowMs };
      this.requests.set(key, requestData);
    }

    requestData.count++;

    if (requestData.count > this.options.maxRequests) {
      logger.warn('Rate limit exceeded', {
        key,
        count: requestData.count,
        limit: this.options.maxRequests,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }
}
```

### Step 3: Create Request ID Middleware
```typescript
// src/common/middleware/request-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.get('X-Request-ID') || uuidv4();
  
  // Add to request object
  (req as any).requestId = requestId;
  
  // Add to response headers
  res.set('X-Request-ID', requestId);
  
  next();
}
```

### Step 4: Create Timeout Middleware
```typescript
// src/common/middleware/timeout.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function createTimeoutMiddleware(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
        });

        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Request timed out',
          timeout: timeoutMs,
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}
```

### Step 5: Create Index Export
```typescript
// src/api/rest/index.ts
export * from './rest.router';
export * from './handlers';
export * from './dtos';
```

## Outputs
- `src/api/rest/rest.router.ts`
- `src/common/middleware/rate-limit.middleware.ts`
- `src/common/middleware/request-id.middleware.ts`
- `src/common/middleware/timeout.middleware.ts`
- `src/api/rest/index.ts`
- Complete REST API routing infrastructure

## Testing Criteria

### Router Tests
- [ ] Route registration works correctly
- [ ] Middleware execution order correct
- [ ] Error handling routes work
- [ ] 404 handling for unknown routes
- [ ] CORS headers set correctly

### Middleware Tests
- [ ] Request logging captures all data
- [ ] Metrics recording works
- [ ] Validation middleware integration
- [ ] Rate limiting functionality
- [ ] Timeout handling works
- [ ] Request ID generation

### Integration Tests
- [ ] Full request/response cycle
- [ ] Multiple concurrent requests
- [ ] Error propagation through middleware
- [ ] Performance under load
- [ ] Memory usage stability

### Security Tests
- [ ] CORS policy enforcement
- [ ] Security headers present
- [ ] Rate limiting effectiveness
- [ ] Input validation integration
- [ ] Error information disclosure

## Performance Requirements
- Middleware overhead: < 5ms per request
- Route resolution: < 1ms
- Memory usage: < 10MB for router
- Concurrent requests: 1000+
- Error handling: < 2ms

## Error Handling
- Unmatched routes → 404 with proper response
- Middleware errors → 500 with logging
- Validation errors → 400 with details
- Rate limit exceeded → 429 with retry info
- Timeout → 504 with timeout info

## Success Criteria
- [ ] Router properly configured
- [ ] All middleware functional
- [ ] Routes registered correctly
- [ ] Error handling comprehensive
- [ ] Performance requirements met
- [ ] Security headers present
- [ ] CORS policy working
- [ ] Rate limiting functional
- [ ] Request logging complete

## Rollback Plan
If implementation fails:
1. Disable problematic middleware
2. Use simple route registration
3. Document middleware issues
4. Fix integration problems

## Notes
- Ensure middleware order is correct
- Test all error scenarios
- Monitor performance impact
- Configure appropriate timeouts
- Set up proper CORS policy
- Add comprehensive logging
- Consider security implications
- Plan for future middleware additions

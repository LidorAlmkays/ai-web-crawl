import { Router, Request, Response } from 'express';
import { WebCrawlHandler } from './handlers/web-crawl.handler';
import { HealthHandler } from './handlers/health.handler';
import { createValidationMiddleware } from '../../common/middleware/validation.middleware';
import { WebCrawlRequestDto } from './dtos/web-crawl-request.dto';
import { IMetricsPort } from '../../infrastructure/ports/metrics.port';

/**
 * REST API router for the gateway service
 * Manages all REST endpoints and middleware
 */
export class RestRouter {
  private router: Router;
  private readonly healthHandler: HealthHandler;

  constructor(
    private readonly webCrawlHandler: WebCrawlHandler,
    private readonly metrics: IMetricsPort
  ) {
    this.router = Router();
    this.healthHandler = new HealthHandler();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware for the router
   */
  private setupMiddleware(): void {
    // Note: Main middleware (CORS, trace context, error handling) is set up in app.ts
    // This router only handles route-specific middleware
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Enhanced health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      this.healthHandler.handleHealthCheck(req, res);
    });

    // Metrics endpoint for Prometheus scraping
    this.router.get('/api/metrics', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(this.metrics.getMetricsData());
    });

    // Web crawl endpoint with validation
    this.router.post(
      '/api/web-crawl',
      createValidationMiddleware(WebCrawlRequestDto),
      (req: Request, res: Response) => {
        this.webCrawlHandler.handleWebCrawlRequest(req, res);
      }
    );

    // 404 handler for unmatched routes
    this.router.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  /**
   * Get the Express router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}

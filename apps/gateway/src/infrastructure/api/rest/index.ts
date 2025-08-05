import express, { Express } from 'express';
import { CrawlController } from './controllers/crawl.controller';
import { createCrawlRoutes } from './routes/crawl.routes';
import { logger } from '../../../common/utils/logger';

export function createRestApi(crawlController: CrawlController): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Gateway service is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/crawl', createCrawlRoutes(crawlController));

  // 404 handler
  app.use('*', (req, res) => {
    logger.warn('Route not found', { url: req.url, method: req.method });
    res.status(404).json({
      success: false,
      message: 'Route not found',
      error: 'The requested endpoint does not exist',
    });
  });

  // Error handling middleware
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error('Unhandled error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'An unexpected error occurred',
      });
    }
  );

  return app;
}

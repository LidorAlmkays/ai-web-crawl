import { Router, Request, Response } from 'express';
import { createHealthCheckRouter } from './health-check.router';
import { IHealthCheckService } from '../../common/health/health-check.interface';
import { WebCrawlMetricsService } from '../../application/metrics/services/WebCrawlMetricsService';
import { logger } from '../../common/utils/logger';
import { traceContextMiddleware } from '../../common/middleware/trace-context.middleware';

/**
 * Main REST API router
 * Combines all REST endpoints including health checks and monitoring
 */
export function createRestRouter(
  healthCheckService: IHealthCheckService,
  metricsService: WebCrawlMetricsService
): Router {
  const router = Router();

  // Add trace context middleware (must be first)
  router.use(traceContextMiddleware);

  // Add request logging middleware (now uses trace-aware logger)
  router.use((req, res, next) => {
    // Skip logging for metrics endpoints entirely
    if (req.path && req.path.startsWith('/metrics')) {
      return next();
    }
    const traceLogger = (req as any).traceLogger || logger;
    traceLogger.debug('REST API request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // Add health check routes
  router.use('/', createHealthCheckRouter(healthCheckService));

  // Add metrics endpoints
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      // Parse hours parameter
      const hoursParam = req.query.hours;
      let hours: number | undefined = undefined;

      if (hoursParam) {
        const parsedHours = parseInt(hoursParam as string, 10);
        if (isNaN(parsedHours) || parsedHours <= 0) {
          return res.status(400).json({
            error: 'Invalid hours parameter. Must be a positive number.',
            timestamp: new Date().toISOString(),
          });
        }
        hours = parsedHours;
      }

      const params = hours ? { hours } : undefined;

      const prometheusMetrics = await metricsService.getPrometheusFormat(
        params
      );

      res.set('Content-Type', 'text/plain');
      return res.status(200).send(prometheusMetrics);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/metrics/json', async (req: Request, res: Response) => {
    try {
      // Parse hours parameter
      const hoursParam = req.query.hours;
      let hours: number | undefined = undefined;

      if (hoursParam) {
        const parsedHours = parseInt(hoursParam as string, 10);
        if (isNaN(parsedHours) || parsedHours <= 0) {
          return res.status(400).json({
            error: 'Invalid hours parameter. Must be a positive number.',
            timestamp: new Date().toISOString(),
          });
        }
        hours = parsedHours;
      }

      const params = hours ? { hours } : undefined;

      const metrics = await metricsService.getMetrics(params);

      return res.status(200).json(metrics);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/metrics/config', (req: Request, res: Response) => {
    try {
      const config = {
        availableTimeRanges: metricsService.getAvailableTimeRanges(),
        defaultTimeRange: metricsService.getDefaultTimeRange(),
        refreshInterval: metricsService.getRefreshInterval(),
      };

      res.status(200).json(config);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve metrics configuration',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Add error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
    logger.error('REST API error', {
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  // Add 404 handler
  router.use('*', (req, res) => {
    logger.error('REST API 404', { method: req.method, path: req.path });

    res.status(404).json({
      error: 'Endpoint not found',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  });

  return router;
}

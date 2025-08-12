import { Router, Request, Response } from 'express';
import { IHealthCheckService } from '../../common/health/health-check.interface';
import { logger } from '../../common/utils/logger';

/**
 * Health check router
 * Provides REST endpoints for system health monitoring
 */
export function createHealthCheckRouter(
  healthCheckService: IHealthCheckService
): Router {
  const router = Router();

  /**
   * GET /health
   * Basic health check endpoint
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      logger.debug('Health check endpoint called');

      const health = await healthCheckService.getSystemHealth();

      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
          ? 200
          : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        version: health.version,
        uptime: health.uptime,
        checks: {
          database: {
            status: health.checks.database.status,
            responseTime: health.checks.database.responseTime,
          },
          kafka: {
            status: health.checks.kafka.status,
            responseTime: health.checks.kafka.responseTime,
          },
          service: {
            status: health.checks.service.status,
            responseTime: health.checks.service.responseTime,
          },
        },
      });
    } catch (error) {
      logger.error('Health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  /**
   * GET /health/detailed
   * Detailed health check with full information
   */
  router.get('/health/detailed', async (req: Request, res: Response) => {
    try {
      logger.debug('Detailed health check endpoint called');

      const health = await healthCheckService.getSystemHealth();

      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
          ? 200
          : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Detailed health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      });
    }
  });

  /**
   * GET /health/database
   * Database-specific health check
   */
  router.get('/health/database', async (req: Request, res: Response) => {
    try {
      logger.debug('Database health check endpoint called');

      const dbHealth = await healthCheckService.checkDatabaseHealth();

      const statusCode = dbHealth.status === 'up' ? 200 : 503;

      res.status(statusCode).json({
        component: 'database',
        status: dbHealth.status,
        timestamp: new Date().toISOString(),
        responseTime: dbHealth.responseTime,
        error: dbHealth.error,
        details: dbHealth.details,
      });
    } catch (error) {
      logger.error('Database health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        component: 'database',
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Database health check failed',
      });
    }
  });

  /**
   * GET /health/kafka
   * Kafka-specific health check
   */
  router.get('/health/kafka', async (req: Request, res: Response) => {
    try {
      logger.debug('Kafka health check endpoint called');

      const kafkaHealth = await healthCheckService.checkKafkaHealth();

      const statusCode = kafkaHealth.status === 'up' ? 200 : 503;

      res.status(statusCode).json({
        component: 'kafka',
        status: kafkaHealth.status,
        timestamp: new Date().toISOString(),
        responseTime: kafkaHealth.responseTime,
        error: kafkaHealth.error,
        details: kafkaHealth.details,
      });
    } catch (error) {
      logger.error('Kafka health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        component: 'kafka',
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Kafka health check failed',
      });
    }
  });

  /**
   * GET /health/service
   * Service-specific health check
   */
  router.get('/health/service', async (req: Request, res: Response) => {
    try {
      logger.debug('Service health check endpoint called');

      const serviceHealth = await healthCheckService.checkServiceHealth();

      const statusCode = serviceHealth.status === 'up' ? 200 : 503;

      res.status(statusCode).json({
        component: 'service',
        status: serviceHealth.status,
        timestamp: new Date().toISOString(),
        responseTime: serviceHealth.responseTime,
        error: serviceHealth.error,
        details: serviceHealth.details,
      });
    } catch (error) {
      logger.error('Service health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        component: 'service',
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed',
      });
    }
  });

  /**
   * GET /health/ready
   * Readiness probe endpoint for Kubernetes
   */
  router.get('/health/ready', async (req: Request, res: Response) => {
    try {
      logger.debug('Readiness probe endpoint called');

      const health = await healthCheckService.getSystemHealth();

      // For readiness, we only care if the service is ready to accept requests
      // Database and Kafka should be available
      const isReady =
        health.checks.database.status === 'up' &&
        health.checks.kafka.status === 'up' &&
        health.checks.service.status === 'up';

      const statusCode = isReady ? 200 : 503;

      res.status(statusCode).json({
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
          database: health.checks.database.status,
          kafka: health.checks.kafka.status,
          service: health.checks.service.status,
        },
      });
    } catch (error) {
      logger.error('Readiness probe endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      });
    }
  });

  /**
   * GET /health/live
   * Liveness probe endpoint for Kubernetes
   */
  router.get('/health/live', async (req: Request, res: Response) => {
    try {
      logger.debug('Liveness probe endpoint called');

      // For liveness, we only check if the service is running
      const serviceHealth = await healthCheckService.checkServiceHealth();

      const isAlive = serviceHealth.status === 'up';
      const statusCode = isAlive ? 200 : 503;

      res.status(statusCode).json({
        alive: isAlive,
        timestamp: new Date().toISOString(),
        uptime: serviceHealth.details?.uptime,
      });
    } catch (error) {
      logger.error('Liveness probe endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      });
    }
  });

  return router;
}

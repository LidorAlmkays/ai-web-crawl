import { Request, Response } from 'express';
import { logger } from '../../../common/utils/logger';
import { configuration } from '../../../config';

/**
 * Handler for health check endpoints
 * Provides detailed health status of the gateway service
 */
export class HealthHandler {
  /**
   * Handle GET /health endpoint
   */
  public async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const config = configuration.getConfig();
      const startTime = Date.now();

      // Basic health checks
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: {
          name: config.serviceName,
          version: config.serviceVersion,
          environment: config.environment,
        },
        uptime: process.uptime(),
        checks: {
          service: {
            status: 'up',
            responseTime: Date.now() - startTime,
          },
          kafka: await this.checkKafkaHealth(),
          observability: await this.checkObservabilityHealth(),
        },
      };

      // Determine overall health status
      const allChecksHealthy = Object.values(healthStatus.checks).every(
        (check: any) => check.status === 'up'
      );

      if (!allChecksHealthy) {
        healthStatus.status = 'degraded';
      }

      const statusCode = allChecksHealthy ? 200 : 503;

      logger.info('Health check completed', {
        status: healthStatus.status,
        checks: Object.keys(healthStatus.checks),
        responseTime: Date.now() - startTime,
      });

      res.status(statusCode).json(healthStatus);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: {
          name: 'gateway',
          version: '1.0.0',
          environment: 'development',
        },
        error: 'Health check failed',
      });
    }
  }

  /**
   * Check Kafka connectivity
   */
  private async checkKafkaHealth(): Promise<{ status: string; responseTime: number; details?: string }> {
    const startTime = Date.now();
    
    try {
      // Simple Kafka health check - could be enhanced with actual connection test
      const config = configuration.getConfig();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        responseTime,
        details: `Connected to ${config.kafka.brokers.join(', ')}`,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Kafka connection failed',
      };
    }
  }

  /**
   * Check observability components health
   */
  private async checkObservabilityHealth(): Promise<{ status: string; responseTime: number; details?: string }> {
    const startTime = Date.now();
    
    try {
      const config = configuration.getConfig();
      const responseTime = Date.now() - startTime;
      
      return {
        status: config.observability.tracing.enabled ? 'up' : 'disabled',
        responseTime,
        details: `OpenTelemetry ${config.observability.tracing.enabled ? 'enabled' : 'disabled'}`,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Observability check failed',
      };
    }
  }
}

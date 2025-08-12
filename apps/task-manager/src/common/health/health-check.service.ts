import { logger } from '../utils/logger';
import {
  IHealthCheckService,
  HealthCheck,
  SystemHealthStatus,
  HealthCheckResult,
} from './health-check.interface';
import { Pool } from 'pg';
import { KafkaClient } from '../clients/kafka-client';

/**
 * Health check service implementation
 * Provides comprehensive health monitoring for system components
 */
export class HealthCheckService implements IHealthCheckService {
  private readonly startTime: number;
  private readonly version: string;

  constructor(
    private readonly databasePool: Pool,
    private readonly kafkaClient: KafkaClient
  ) {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  /**
   * Check database connectivity and health
   */
  async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    let client: any = null;

    try {
      logger.debug('Checking database health...');

      // Test database connection
      client = await this.databasePool.connect();

      // Simple query to test connectivity
      await client.query('SELECT 1 as health_check');

      // Test if we can access our main table
      const tableResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM web_crawl_tasks 
        LIMIT 1
      `);

      const responseTime = Date.now() - startTime;

      logger.debug('Database health check completed successfully', {
        responseTime,
      });

      return {
        status: 'up',
        responseTime,
        details: {
          connectionPoolSize: this.databasePool.totalCount,
          idleConnections: this.databasePool.idleCount,
          activeConnections:
            this.databasePool.totalCount - this.databasePool.idleCount,
          tableAccessible: tableResult.rows[0]?.count !== undefined,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';

      logger.error('Database health check failed', {
        error: errorMessage,
        responseTime,
      });

      return {
        status: 'down',
        responseTime,
        error: errorMessage,
        details: {
          connectionPoolSize: this.databasePool.totalCount,
          idleConnections: this.databasePool.idleCount,
        },
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Check Kafka connectivity and health
   */
  async checkKafkaHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      logger.debug('Checking Kafka health...');

      const metadata = await this.kafkaClient.fetchClusterMetadata();

      const responseTime = Date.now() - startTime;

      logger.debug('Kafka health check completed successfully', {
        responseTime,
        topicsCount: metadata.topicsCount,
      });

      return {
        status: 'up',
        responseTime,
        details: {
          topicsCount: metadata.topicsCount,
          clusterId: metadata.clusterId || 'unknown',
          controllerId: metadata.controllerId || 'unknown',
          isConnected: this.kafkaClient.getConnectionStatus(),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Kafka error';

      logger.error('Kafka health check failed', {
        error: errorMessage,
        responseTime,
      });

      return {
        status: 'down',
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Check service health (memory, uptime, etc.)
   */
  async checkServiceHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      logger.debug('Checking service health...');

      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();

      const responseTime = Date.now() - startTime;

      logger.debug('Service health check completed successfully', {
        responseTime,
      });

      return {
        status: 'up',
        responseTime,
        details: {
          uptime,
          memoryUsage: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          },
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown service error';

      logger.error('Service health check failed', {
        error: errorMessage,
        responseTime,
      });

      return {
        status: 'down',
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Get complete system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    logger.info('Performing system health check');

    const startTime = Date.now();

    // Run all health checks in parallel
    const [databaseHealth, kafkaHealth, serviceHealth] =
      await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkKafkaHealth(),
        this.checkServiceHealth(),
      ]);

    const checks = {
      database:
        databaseHealth.status === 'fulfilled'
          ? databaseHealth.value
          : {
              status: 'down' as const,
              error: databaseHealth.reason?.message || 'Database check failed',
            },
      kafka:
        kafkaHealth.status === 'fulfilled'
          ? kafkaHealth.value
          : {
              status: 'down' as const,
              error: kafkaHealth.reason?.message || 'Kafka check failed',
            },
      service:
        serviceHealth.status === 'fulfilled'
          ? serviceHealth.value
          : {
              status: 'down' as const,
              error: serviceHealth.reason?.message || 'Service check failed',
            },
    };

    // Determine overall system status
    const downChecks = Object.values(checks).filter(
      (check) => check.status === 'down'
    ).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (downChecks === 0) {
      status = 'healthy';
    } else if (downChecks === totalChecks) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    const duration = Date.now() - startTime;

    logger.info('System health check completed', {
      status,
      duration,
      downChecks,
      totalChecks,
    });

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.version,
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * Get detailed health check results with timing
   */
  async getDetailedHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    const components = [
      { name: 'database', check: this.checkDatabaseHealth() },
      { name: 'kafka', check: this.checkKafkaHealth() },
      { name: 'service', check: this.checkServiceHealth() },
    ];

    for (const component of components) {
      const startTime = Date.now();
      const check = await component.check;
      const duration = Date.now() - startTime;

      results.push({
        component: component.name,
        check,
        timestamp: new Date().toISOString(),
        duration,
      });
    }

    return results;
  }
}

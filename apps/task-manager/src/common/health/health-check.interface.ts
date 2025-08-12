/**
 * Health check status types
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';
export type ComponentStatus = 'up' | 'down';

/**
 * Individual component health check result
 */
export interface HealthCheck {
  status: ComponentStatus;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Complete system health status
 */
export interface SystemHealthStatus {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    kafka: HealthCheck;
    service: HealthCheck;
  };
}

/**
 * Health check service interface
 */
export interface IHealthCheckService {
  checkDatabaseHealth(): Promise<HealthCheck>;
  checkKafkaHealth(): Promise<HealthCheck>;
  checkServiceHealth(): Promise<HealthCheck>;
  getSystemHealth(): Promise<SystemHealthStatus>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
}

/**
 * Health check result with metadata
 */
export interface HealthCheckResult {
  component: string;
  check: HealthCheck;
  timestamp: string;
  duration: number;
}

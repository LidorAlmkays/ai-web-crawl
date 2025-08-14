/**
 * Tracing configuration interface and default values
 *
 * This module provides configuration options for the distributed tracing
 * implementation, including sampling rates, endpoints, and performance settings.
 */

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  exportEndpoint: string;
  serviceName: string;
  environment: string;
  attributes: Record<string, string>;
  batchProcessor: {
    maxQueueSize: number;
    maxExportBatchSize: number;
    scheduledDelayMillis: number;
    exportTimeoutMillis: number;
  };
  performance: {
    thresholdMs: number;
    memoryThresholdMb: number;
  };
}

/**
 * Default tracing configuration
 *
 * This configuration can be overridden by environment variables
 * to support different deployment environments.
 */
export const tracingConfig: TracingConfig = {
  enabled: process.env.TRACING_ENABLED === 'true',
  samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '1.0'),
  exportEndpoint:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
  serviceName: process.env.OTEL_SERVICE_NAME || 'task-manager',
  environment: process.env.NODE_ENV || 'development',
  attributes: {
    'service.type': 'task-manager',
    'service.team': 'platform',
    'service.version': process.env.npm_package_version || '1.0.0',
  },
  batchProcessor: {
    maxQueueSize: parseInt(process.env.TRACING_MAX_QUEUE_SIZE || '2048'),
    maxExportBatchSize: parseInt(process.env.TRACING_MAX_BATCH_SIZE || '512'),
    scheduledDelayMillis: parseInt(process.env.TRACING_DELAY_MS || '5000'),
    exportTimeoutMillis: parseInt(process.env.TRACING_TIMEOUT_MS || '30000'),
  },
  performance: {
    thresholdMs: parseFloat(
      process.env.TRACING_PERFORMANCE_THRESHOLD_MS || '1.0'
    ),
    memoryThresholdMb: parseInt(
      process.env.TRACING_MEMORY_THRESHOLD_MB || '50'
    ),
  },
};

/**
 * Environment-specific tracing configurations
 */
export const tracingConfigs = {
  development: {
    ...tracingConfig,
    samplingRate: 1.0,
    enabled: true,
  },
  staging: {
    ...tracingConfig,
    samplingRate: 0.5,
    enabled: true,
  },
  production: {
    ...tracingConfig,
    samplingRate: 0.1,
    enabled: true,
  },
  test: {
    ...tracingConfig,
    samplingRate: 1.0,
    enabled: false, // Disable tracing in tests by default
  },
};

/**
 * Get tracing configuration for current environment
 *
 * @returns Tracing configuration for the current environment
 */
export function getTracingConfig(): TracingConfig {
  const env = process.env.NODE_ENV || 'development';
  return (
    tracingConfigs[env as keyof typeof tracingConfigs] ||
    tracingConfigs.development
  );
}

/**
 * Validate tracing configuration
 *
 * @param config - The configuration to validate
 * @returns Validation result with errors if any
 */
export function validateTracingConfig(config: TracingConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate sampling rate
  if (config.samplingRate < 0 || config.samplingRate > 1) {
    errors.push('Sampling rate must be between 0.0 and 1.0');
  }

  // Validate export endpoint
  if (!config.exportEndpoint) {
    errors.push('Export endpoint is required');
  }

  // Validate service name
  if (!config.serviceName) {
    errors.push('Service name is required');
  }

  // Validate batch processor settings
  if (config.batchProcessor.maxQueueSize <= 0) {
    errors.push('Max queue size must be greater than 0');
  }

  if (config.batchProcessor.maxExportBatchSize <= 0) {
    errors.push('Max export batch size must be greater than 0');
  }

  if (config.batchProcessor.scheduledDelayMillis <= 0) {
    errors.push('Scheduled delay must be greater than 0');
  }

  if (config.batchProcessor.exportTimeoutMillis <= 0) {
    errors.push('Export timeout must be greater than 0');
  }

  // Validate performance thresholds
  if (config.performance.thresholdMs <= 0) {
    errors.push('Performance threshold must be greater than 0');
  }

  if (config.performance.memoryThresholdMb <= 0) {
    errors.push('Memory threshold must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment variables for tracing configuration
 *
 * @returns Object with environment variables for tracing
 */
export function getTracingEnvironmentVariables(): Record<string, string> {
  const config = getTracingConfig();

  return {
    TRACING_ENABLED: config.enabled.toString(),
    TRACING_SAMPLING_RATE: config.samplingRate.toString(),
    OTEL_EXPORTER_OTLP_ENDPOINT: config.exportEndpoint,
    OTEL_SERVICE_NAME: config.serviceName,
    OTEL_RESOURCE_ATTRIBUTES: Object.entries(config.attributes)
      .map(([key, value]) => `${key}=${value}`)
      .join(','),
    TRACING_MAX_QUEUE_SIZE: config.batchProcessor.maxQueueSize.toString(),
    TRACING_MAX_BATCH_SIZE: config.batchProcessor.maxExportBatchSize.toString(),
    TRACING_DELAY_MS: config.batchProcessor.scheduledDelayMillis.toString(),
    TRACING_TIMEOUT_MS: config.batchProcessor.exportTimeoutMillis.toString(),
    TRACING_PERFORMANCE_THRESHOLD_MS: config.performance.thresholdMs.toString(),
    TRACING_MEMORY_THRESHOLD_MB:
      config.performance.memoryThresholdMb.toString(),
  };
}






import { z } from 'zod';
import { appConfig } from './app';

/**
 * Observability (OpenTelemetry) configuration
 * - Single source of truth for traces, logs, and shared OTLP endpoint
 */
const observabilitySchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // OTLP base endpoint, e.g. http://localhost:4318
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),

  // Tracing
  TRACING_ENABLED: z.coerce.boolean().default(true),
  TRACING_SAMPLING_RATE: z.coerce.number().min(0).max(1).default(1.0),
  TRACING_MAX_QUEUE_SIZE: z.coerce.number().int().positive().default(2048),
  TRACING_MAX_BATCH_SIZE: z.coerce.number().int().positive().default(512),
  TRACING_DELAY_MS: z.coerce.number().int().positive().default(5000),
  TRACING_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // Logs
  OTEL_LOGS_ENABLED: z.coerce.boolean().default(true),
});

const env = observabilitySchema.parse(process.env);

export const observabilityConfig = {
  environment: env.NODE_ENV,
  exporterEndpointBase: env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, ''),
  service: {
    name: appConfig.app.name,
    version: appConfig.app.version,
    environment: appConfig.env,
  },
  traces: {
    enabled: env.TRACING_ENABLED && env.NODE_ENV !== 'test',
    samplingRate: env.TRACING_SAMPLING_RATE,
    /** Computed OTLP traces endpoint */
    endpoint: `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`,
    batch: {
      maxQueueSize: env.TRACING_MAX_QUEUE_SIZE,
      maxExportBatchSize: env.TRACING_MAX_BATCH_SIZE,
      scheduledDelayMillis: env.TRACING_DELAY_MS,
      exportTimeoutMillis: env.TRACING_TIMEOUT_MS,
    },
  },
  logs: {
    enabled: env.OTEL_LOGS_ENABLED,
    /** Computed OTLP logs endpoint */
    endpoint: `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/logs`,
  },
} as const;

export type ObservabilityConfig = typeof observabilityConfig;



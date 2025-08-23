import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('gateway'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(3002),
  
    // Health check
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default(true),
  HEALTH_CHECK_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(3003),
  HEALTH_CHECK_PATH: z.string().default('/health'),

  // Kafka
  KAFKA_BROKERS: z.string().transform(val => val.split(',')).default(['localhost:9092']),
  KAFKA_CLIENT_ID: z.string().default('gateway-service'),
  KAFKA_TOPIC_TASK_STATUS: z.string().default('task-status'),
  KAFKA_RETRY_INITIAL_TIME: z.string().transform(Number).default(1000),
  KAFKA_RETRY_RETRIES: z.string().transform(Number).default(3),

  // OpenTelemetry
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),
  TRACING_ENABLED: z.string().transform(val => val === 'true').default(true),
  TRACING_SAMPLING_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)).default(1.0),

  // Metrics
  METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(9465),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_INCLUDE_TIMESTAMP: z.string().transform(val => val === 'true').default(true),
});

export type EnvConfig = z.infer<typeof envSchema>;

import { z } from 'zod';

/**
 * REST API configuration: only REST-specific concerns
 */
const restSchema = z.object({
  // Health check
  HEALTH_CHECK_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_PORT: z.coerce.number().int().positive().default(3001),
  HEALTH_CHECK_PATH: z.string().default('/health'),

  // CORS
  CORS_ENABLED: z.coerce.boolean().default(true),
  CORS_ORIGIN: z.string().default('*'),

  // Metrics UI/service settings (not business metrics)
  METRICS_DEFAULT_TIME_RANGE_HOURS: z.coerce.number().int().positive().default(24),
  METRICS_AVAILABLE_TIME_RANGES: z.string().default('1,6,12,24,48,72'),
  METRICS_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().positive().default(15),
});

const env = restSchema.parse(process.env);

function parseRanges(def: string): number[] {
  try {
    const arr = def.split(',').map((v) => parseInt(v.trim(), 10));
    return arr.every((n) => !isNaN(n)) ? arr : [1, 6, 12, 24, 48, 72];
  } catch {
    return [1, 6, 12, 24, 48, 72];
  }
}

export const restConfig = {
  healthCheck: {
    enabled: env.HEALTH_CHECK_ENABLED,
    port: env.HEALTH_CHECK_PORT,
    path: env.HEALTH_CHECK_PATH,
  },
  cors: {
    enabled: env.CORS_ENABLED,
    origin: env.CORS_ORIGIN,
  },
  metricsUi: {
    defaultTimeRangeHours: env.METRICS_DEFAULT_TIME_RANGE_HOURS,
    availableTimeRanges: parseRanges(env.METRICS_AVAILABLE_TIME_RANGES),
    refreshIntervalSeconds: env.METRICS_REFRESH_INTERVAL_SECONDS,
  },
} as const;

export type RestConfig = typeof restConfig;



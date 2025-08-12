export interface MetricsConfig {
  defaultTimeRangeHours: number;
  availableTimeRanges: number[];
  refreshIntervalSeconds: number;
}

// Helper function to parse environment variable as number with fallback
function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) return fallback;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// Helper function to parse environment variable as array of numbers
function getEnvNumberArray(key: string, fallback: number[]): number[] {
  const value = process.env[key];
  if (value === undefined) return fallback;

  try {
    const parsed = value.split(',').map((v) => parseInt(v.trim(), 10));
    return parsed.every((n) => !isNaN(n)) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const metricsConfig: MetricsConfig = {
  defaultTimeRangeHours: getEnvNumber('METRICS_DEFAULT_TIME_RANGE_HOURS', 24),
  availableTimeRanges: getEnvNumberArray(
    'METRICS_AVAILABLE_TIME_RANGES',
    [1, 6, 12, 24, 48, 72]
  ),
  refreshIntervalSeconds: getEnvNumber('METRICS_REFRESH_INTERVAL_SECONDS', 15),
};

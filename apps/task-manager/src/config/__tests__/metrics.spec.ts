import { metricsConfig, MetricsConfig } from '../metrics';

// Save original environment
const originalEnv = process.env;

describe('Metrics Configuration', () => {
  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should have correct default values', () => {
      expect(metricsConfig.defaultTimeRangeHours).toBe(24);
      expect(metricsConfig.availableTimeRanges).toEqual([1, 6, 12, 24, 48, 72]);
      expect(metricsConfig.refreshIntervalSeconds).toBe(15);
    });

    it('should match MetricsConfig interface', () => {
      const config: MetricsConfig = metricsConfig;

      expect(typeof config.defaultTimeRangeHours).toBe('number');
      expect(Array.isArray(config.availableTimeRanges)).toBe(true);
      expect(typeof config.refreshIntervalSeconds).toBe('number');
    });
  });

  describe('Environment Variable Support', () => {
    it('should read METRICS_DEFAULT_TIME_RANGE_HOURS from environment', () => {
      process.env.METRICS_DEFAULT_TIME_RANGE_HOURS = '12';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.defaultTimeRangeHours).toBe(12);
    });

    it('should read METRICS_AVAILABLE_TIME_RANGES from environment', () => {
      process.env.METRICS_AVAILABLE_TIME_RANGES = '1,2,3,6,12';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.availableTimeRanges).toEqual([1, 2, 3, 6, 12]);
    });

    it('should read METRICS_REFRESH_INTERVAL_SECONDS from environment', () => {
      process.env.METRICS_REFRESH_INTERVAL_SECONDS = '30';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.refreshIntervalSeconds).toBe(30);
    });

    it('should use fallback values when environment variables are not set', () => {
      delete process.env.METRICS_DEFAULT_TIME_RANGE_HOURS;
      delete process.env.METRICS_AVAILABLE_TIME_RANGES;
      delete process.env.METRICS_REFRESH_INTERVAL_SECONDS;

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.defaultTimeRangeHours).toBe(24);
      expect(freshConfig.availableTimeRanges).toEqual([1, 6, 12, 24, 48, 72]);
      expect(freshConfig.refreshIntervalSeconds).toBe(15);
    });
  });

  describe('Environment Variable Validation', () => {
    it('should handle invalid METRICS_DEFAULT_TIME_RANGE_HOURS gracefully', () => {
      process.env.METRICS_DEFAULT_TIME_RANGE_HOURS = 'invalid';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.defaultTimeRangeHours).toBe(24); // fallback
    });

    it('should handle invalid METRICS_REFRESH_INTERVAL_SECONDS gracefully', () => {
      process.env.METRICS_REFRESH_INTERVAL_SECONDS = 'not-a-number';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.refreshIntervalSeconds).toBe(15); // fallback
    });

    it('should handle invalid METRICS_AVAILABLE_TIME_RANGES gracefully', () => {
      process.env.METRICS_AVAILABLE_TIME_RANGES = '1,invalid,3';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.availableTimeRanges).toEqual([1, 6, 12, 24, 48, 72]); // fallback
    });

    it('should handle empty METRICS_AVAILABLE_TIME_RANGES gracefully', () => {
      process.env.METRICS_AVAILABLE_TIME_RANGES = '';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.availableTimeRanges).toEqual([1, 6, 12, 24, 48, 72]); // fallback
    });

    it('should handle malformed METRICS_AVAILABLE_TIME_RANGES gracefully', () => {
      process.env.METRICS_AVAILABLE_TIME_RANGES = '1,,3,';

      // Re-import to get fresh config
      jest.resetModules();
      const { metricsConfig: freshConfig } = require('../metrics');

      expect(freshConfig.availableTimeRanges).toEqual([1, 6, 12, 24, 48, 72]); // fallback
    });
  });

  describe('Configuration Validation', () => {
    it('should have positive defaultTimeRangeHours', () => {
      expect(metricsConfig.defaultTimeRangeHours).toBeGreaterThan(0);
    });

    it('should have positive refreshIntervalSeconds', () => {
      expect(metricsConfig.refreshIntervalSeconds).toBeGreaterThan(0);
    });

    it('should have non-empty availableTimeRanges array', () => {
      expect(metricsConfig.availableTimeRanges.length).toBeGreaterThan(0);
    });

    it('should have all positive values in availableTimeRanges', () => {
      metricsConfig.availableTimeRanges.forEach((timeRange) => {
        expect(timeRange).toBeGreaterThan(0);
      });
    });

    it('should have defaultTimeRangeHours in availableTimeRanges', () => {
      expect(metricsConfig.availableTimeRanges).toContain(
        metricsConfig.defaultTimeRangeHours
      );
    });
  });

  describe('Cross-Layer Compatibility', () => {
    it('should be compatible with domain types', () => {
      // Test that config values work with domain types
      const queryParams = {
        hours: metricsConfig.defaultTimeRangeHours,
      };

      expect(typeof queryParams.hours).toBe('number');
      expect(queryParams.hours).toBeGreaterThan(0);
    });

    it('should be compatible with infrastructure layer', () => {
      // Test that config values can be used with SQL functions
      const hours = metricsConfig.defaultTimeRangeHours;

      expect(typeof hours).toBe('number');
      expect(hours).toBeGreaterThan(0);
      expect(Number.isInteger(hours)).toBe(true);
    });
  });
});

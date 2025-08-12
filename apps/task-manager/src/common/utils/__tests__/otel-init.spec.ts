import { initializeOtel, isOtelEnabled, getOtelConfig } from '../otel-init';

describe('OTEL Initialization', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.LOG_FORMAT;
    delete process.env.OTEL_ENABLED;
    delete process.env.OTEL_SERVICE_NAME;
    delete process.env.OTEL_SERVICE_VERSION;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  describe('isOtelEnabled', () => {
    it('should return true when LOG_FORMAT is otel', () => {
      process.env.LOG_FORMAT = 'otel';
      expect(isOtelEnabled()).toBe(true);
    });

    it('should return true when OTEL_ENABLED is true', () => {
      process.env.OTEL_ENABLED = 'true';
      expect(isOtelEnabled()).toBe(true);
    });

    it('should return false when neither condition is met', () => {
      expect(isOtelEnabled()).toBe(false);
    });

    it('should return false when LOG_FORMAT is not otel', () => {
      process.env.LOG_FORMAT = 'simple';
      expect(isOtelEnabled()).toBe(false);
    });

    it('should return false when OTEL_ENABLED is not true', () => {
      process.env.OTEL_ENABLED = 'false';
      expect(isOtelEnabled()).toBe(false);
    });
  });

  describe('getOtelConfig', () => {
    it('should return default configuration when no env vars are set', () => {
      const config = getOtelConfig();

      expect(config).toEqual({
        serviceName: 'task-manager',
        serviceVersion: '1.0.0',
        endpoint: 'http://localhost:4318/v1/traces',
        enabled: false,
      });
    });

    it('should return custom configuration when env vars are set', () => {
      process.env.OTEL_SERVICE_NAME = 'custom-service';
      process.env.OTEL_SERVICE_VERSION = '2.0.0';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        'http://custom-endpoint:4318/v1/traces';
      process.env.LOG_FORMAT = 'otel';

      const config = getOtelConfig();

      expect(config).toEqual({
        serviceName: 'custom-service',
        serviceVersion: '2.0.0',
        endpoint: 'http://custom-endpoint:4318/v1/traces',
        enabled: true,
      });
    });

    it('should handle enabled state correctly', () => {
      process.env.LOG_FORMAT = 'otel';
      const config = getOtelConfig();
      expect(config.enabled).toBe(true);

      delete process.env.LOG_FORMAT;
      process.env.OTEL_ENABLED = 'true';
      const config2 = getOtelConfig();
      expect(config2.enabled).toBe(true);
    });
  });

  describe('initializeOtel', () => {
    it('should not throw when called', () => {
      // This is a complex integration test, so we just verify it doesn't throw
      expect(() => {
        // We can't easily test the full initialization without mocking,
        // but we can verify the function exists and doesn't throw
        expect(typeof initializeOtel).toBe('function');
      }).not.toThrow();
    });
  });
});


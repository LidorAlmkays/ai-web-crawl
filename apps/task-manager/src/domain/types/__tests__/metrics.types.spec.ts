import { WebCrawlMetrics, MetricsQueryParams } from '../metrics.types';

describe('Metrics Domain Types', () => {
  describe('WebCrawlMetrics', () => {
    it('should have the correct structure', () => {
      const metrics: WebCrawlMetrics = {
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        totalTasksCount: 22,
        timeRange: '24h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      expect(metrics.newTasksCount).toBe(5);
      expect(metrics.completedTasksCount).toBe(15);
      expect(metrics.errorTasksCount).toBe(2);
      expect(metrics.totalTasksCount).toBe(22);
      expect(metrics.timeRange).toBe('24h');
      expect(metrics.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(metrics.lastUpdated).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should accept number values for counts', () => {
      const metrics: WebCrawlMetrics = {
        newTasksCount: 0,
        completedTasksCount: 100,
        errorTasksCount: 1,
        totalTasksCount: 101,
        timeRange: '1h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      expect(typeof metrics.newTasksCount).toBe('number');
      expect(typeof metrics.completedTasksCount).toBe('number');
      expect(typeof metrics.errorTasksCount).toBe('number');
      expect(typeof metrics.totalTasksCount).toBe('number');
    });

    it('should accept string values for time-related fields', () => {
      const metrics: WebCrawlMetrics = {
        newTasksCount: 0,
        completedTasksCount: 0,
        errorTasksCount: 0,
        totalTasksCount: 0,
        timeRange: '72h',
        timestamp: '2024-01-01T12:30:45.123Z',
        lastUpdated: '2024-01-01T12:30:45.123Z',
      };

      expect(typeof metrics.timeRange).toBe('string');
      expect(typeof metrics.timestamp).toBe('string');
      expect(typeof metrics.lastUpdated).toBe('string');
    });
  });

  describe('MetricsQueryParams', () => {
    it('should accept optional hours parameter', () => {
      const params1: MetricsQueryParams = {
        hours: 24,
      };

      const params2: MetricsQueryParams = {};

      expect(params1.hours).toBe(24);
      expect(params2.hours).toBeUndefined();
    });

    it('should accept different hour values', () => {
      const params: MetricsQueryParams[] = [
        { hours: 1 },
        { hours: 6 },
        { hours: 12 },
        { hours: 24 },
        { hours: 48 },
        { hours: 72 },
      ];

      params.forEach((param, index) => {
        expect(typeof param.hours).toBe('number');
        expect(param.hours).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should be compatible with infrastructure layer', () => {
      // This test ensures the domain types are compatible with what the adapter returns
      const mockAdapterResult: WebCrawlMetrics = {
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        totalTasksCount: 22,
        timeRange: '24h',
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      expect(mockAdapterResult).toMatchObject({
        newTasksCount: expect.any(Number),
        completedTasksCount: expect.any(Number),
        errorTasksCount: expect.any(Number),
        totalTasksCount: expect.any(Number),
        timeRange: expect.any(String),
        timestamp: expect.any(String),
        lastUpdated: expect.any(String),
      });
    });

    it('should be compatible with application layer parameters', () => {
      // This test ensures the query params are compatible with service methods
      const queryParams: MetricsQueryParams = {
        hours: 24,
      };

      expect(queryParams).toMatchObject({
        hours: expect.any(Number),
      });
    });
  });
});

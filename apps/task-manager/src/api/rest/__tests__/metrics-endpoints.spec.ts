import request from 'supertest';
import express from 'express';
import { createRestRouter } from '../rest.router';
import { HealthCheckService } from '../../../common/health/health-check.service';
import { WebCrawlMetricsService } from '../../../application/metrics/services/WebCrawlMetricsService';

// Mock dependencies
jest.mock('../../../common/health/health-check.service');
jest.mock('../../../application/metrics/services/WebCrawlMetricsService');

describe('Metrics Endpoints', () => {
  let app: express.Application;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;
  let mockMetricsService: jest.Mocked<WebCrawlMetricsService>;

  beforeEach(() => {
    // Create mock instances
    mockHealthCheckService = {
      checkDatabaseHealth: jest.fn(),
      checkKafkaHealth: jest.fn(),
      checkServiceHealth: jest.fn(),
      getSystemHealth: jest.fn(),
      getDetailedHealthChecks: jest.fn(),
    } as any;

    mockMetricsService = {
      getMetrics: jest.fn(),
      getPrometheusFormat: jest.fn(),
      getNewTasksCount: jest.fn(),
      getCompletedTasksCount: jest.fn(),
      getErrorTasksCount: jest.fn(),
      getAvailableTimeRanges: jest.fn(),
      getDefaultTimeRange: jest.fn(),
      getRefreshInterval: jest.fn(),
    } as any;

    // Create Express app with mocked dependencies
    app = express();
    const router = createRestRouter(mockHealthCheckService, mockMetricsService);
    app.use('/api', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/metrics/json', () => {
    it('should return JSON metrics with custom time range', async () => {
      const mockMetrics = {
        newTasksCount: 3,
        completedTasksCount: 10,
        errorTasksCount: 1,
        timeRange: '12h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/metrics/json?hours=12')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual(mockMetrics);
      expect(mockMetricsService.getMetrics).toHaveBeenCalledWith({ hours: 12 });
    });

    it('should handle metrics service errors gracefully', async () => {
      mockMetricsService.getMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/metrics/json').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to retrieve metrics',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /api/metrics', () => {
    it('should return Prometheus format metrics', async () => {
      const mockPrometheusMetrics = `# HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last 24h
# TYPE web_crawl_new_tasks_total counter
web_crawl_new_tasks_total{time_range="24h"} 5`;

      mockMetricsService.getPrometheusFormat.mockResolvedValue(
        mockPrometheusMetrics
      );

      const response = await request(app).get('/api/metrics').expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe(mockPrometheusMetrics);
    });
  });
});

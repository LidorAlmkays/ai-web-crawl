import { WebCrawlMetricsService } from '../WebCrawlMetricsService';
import { IWebCrawlMetricsDataPort } from '../../ports/IWebCrawlMetricsDataPort';
import {
  WebCrawlMetrics,
  MetricsQueryParams,
} from '../../../../domain/types/metrics.types';
import { metricsConfig } from '../../../../config/metrics';

describe('WebCrawlMetricsService', () => {
  let service: WebCrawlMetricsService;
  let mockMetricsDataPort: jest.Mocked<IWebCrawlMetricsDataPort>;

  beforeEach(() => {
    mockMetricsDataPort = {
      getWebCrawlMetrics: jest.fn(),
      getNewTasksCount: jest.fn(),
      getCompletedTasksCount: jest.fn(),
      getErrorTasksCount: jest.fn(),
      getTotalTasksCountByCreationTime: jest.fn(),
    };

    service = new WebCrawlMetricsService(mockMetricsDataPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should call data port with default time range when no params provided', async () => {
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        totalTasksCount: 22,
        timeRange: '24h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getMetrics();

      expect(mockMetricsDataPort.getWebCrawlMetrics).toHaveBeenCalledWith(
        metricsConfig.defaultTimeRangeHours
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should call data port with provided time range when params provided', async () => {
      const params: MetricsQueryParams = { hours: 12 };
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 3,
        completedTasksCount: 10,
        errorTasksCount: 1,
        totalTasksCount: 14,
        timeRange: '12h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getMetrics(params);

      expect(mockMetricsDataPort.getWebCrawlMetrics).toHaveBeenCalledWith(12);
      expect(result).toEqual(mockMetrics);
    });

    it('should handle data port errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockMetricsDataPort.getWebCrawlMetrics.mockRejectedValue(error);

      await expect(service.getMetrics()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getPrometheusFormat', () => {
    it('should return properly formatted Prometheus metrics with default time range', async () => {
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        totalTasksCount: 22,
        timeRange: '24h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getPrometheusFormat();

      expect(result).toContain('# HELP web_crawl_new_tasks_total');
      expect(result).toContain('# TYPE web_crawl_new_tasks_total counter');
      expect(result).toContain('web_crawl_new_tasks_total{time_range="24h"} 5');
      expect(result).toContain(
        'web_crawl_completed_tasks_total{time_range="24h"} 15'
      );
      expect(result).toContain(
        'web_crawl_error_tasks_total{time_range="24h"} 2'
      );
      expect(result).toContain('# HELP web_crawl_total_tasks_count');
      expect(result).toContain('# TYPE web_crawl_total_tasks_count gauge');
      expect(result).toContain(
        'web_crawl_total_tasks_count{time_range="24h"} 22'
      );
      expect(result).toContain('web_crawl_metrics_timestamp{time_range="24h"}');
    });

    it('should return properly formatted Prometheus metrics with custom time range', async () => {
      const params: MetricsQueryParams = { hours: 12 };
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 3,
        completedTasksCount: 10,
        errorTasksCount: 1,
        totalTasksCount: 14,
        timeRange: '12h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getPrometheusFormat(params);

      expect(result).toContain('web_crawl_new_tasks_total{time_range="12h"} 3');
      expect(result).toContain(
        'web_crawl_completed_tasks_total{time_range="12h"} 10'
      );
      expect(result).toContain(
        'web_crawl_error_tasks_total{time_range="12h"} 1'
      );
      expect(result).toContain(
        'web_crawl_total_tasks_count{time_range="12h"} 14'
      );
    });

    it('should include timestamp in Prometheus format', async () => {
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 0,
        completedTasksCount: 0,
        errorTasksCount: 0,
        totalTasksCount: 0,
        timeRange: '24h',
        timestamp: '2024-01-01T12:00:00.000Z',
        lastUpdated: '2024-01-01T12:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getPrometheusFormat();

      expect(result).toContain('# HELP web_crawl_metrics_timestamp');
      expect(result).toContain('# TYPE web_crawl_metrics_timestamp gauge');
      expect(result).toContain('web_crawl_metrics_timestamp{time_range="24h"}');
    });
  });

  describe('Individual Count Methods', () => {
    it('should call getNewTasksCount with default time range', async () => {
      mockMetricsDataPort.getNewTasksCount.mockResolvedValue(5);

      const result = await service.getNewTasksCount();

      expect(mockMetricsDataPort.getNewTasksCount).toHaveBeenCalledWith(
        metricsConfig.defaultTimeRangeHours
      );
      expect(result).toBe(5);
    });

    it('should call getCompletedTasksCount with custom time range', async () => {
      const params: MetricsQueryParams = { hours: 6 };
      mockMetricsDataPort.getCompletedTasksCount.mockResolvedValue(10);

      const result = await service.getCompletedTasksCount(params);

      expect(mockMetricsDataPort.getCompletedTasksCount).toHaveBeenCalledWith(
        6
      );
      expect(result).toBe(10);
    });

    it('should call getErrorTasksCount with custom time range', async () => {
      const params: MetricsQueryParams = { hours: 1 };
      mockMetricsDataPort.getErrorTasksCount.mockResolvedValue(2);

      const result = await service.getErrorTasksCount(params);

      expect(mockMetricsDataPort.getErrorTasksCount).toHaveBeenCalledWith(1);
      expect(result).toBe(2);
    });

    it('should call getTotalTasksCountByCreationTime with default time range', async () => {
      mockMetricsDataPort.getTotalTasksCountByCreationTime.mockResolvedValue(
        22
      );

      const result = await service.getTotalTasksCountByCreationTime();

      expect(
        mockMetricsDataPort.getTotalTasksCountByCreationTime
      ).toHaveBeenCalledWith(metricsConfig.defaultTimeRangeHours);
      expect(result).toBe(22);
    });

    it('should call getTotalTasksCountByCreationTime with custom time range', async () => {
      const params: MetricsQueryParams = { hours: 6 };
      mockMetricsDataPort.getTotalTasksCountByCreationTime.mockResolvedValue(8);

      const result = await service.getTotalTasksCountByCreationTime(params);

      expect(
        mockMetricsDataPort.getTotalTasksCountByCreationTime
      ).toHaveBeenCalledWith(6);
      expect(result).toBe(8);
    });
  });

  describe('Configuration Methods', () => {
    it('should return available time ranges from config', () => {
      const result = service.getAvailableTimeRanges();

      expect(result).toEqual(metricsConfig.availableTimeRanges);
    });

    it('should return default time range from config', () => {
      const result = service.getDefaultTimeRange();

      expect(result).toBe(metricsConfig.defaultTimeRangeHours);
    });

    it('should return refresh interval from config', () => {
      const result = service.getRefreshInterval();

      expect(result).toBe(metricsConfig.refreshIntervalSeconds);
    });
  });

  describe('Dependency Injection', () => {
    it('should accept metrics data port in constructor', () => {
      expect(service).toBeInstanceOf(WebCrawlMetricsService);
    });

    it('should use injected data port for all operations', async () => {
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        timeRange: '24h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      await service.getMetrics();

      expect(mockMetricsDataPort.getWebCrawlMetrics).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from data port', async () => {
      const error = new Error('Data port error');
      mockMetricsDataPort.getWebCrawlMetrics.mockRejectedValue(error);

      await expect(service.getMetrics()).rejects.toThrow('Data port error');
    });

    it('should handle individual count method errors', async () => {
      const error = new Error('Count method error');
      mockMetricsDataPort.getNewTasksCount.mockRejectedValue(error);

      await expect(service.getNewTasksCount()).rejects.toThrow(
        'Count method error'
      );
    });
  });

  describe('Business Logic', () => {
    it('should use configuration defaults when no params provided', async () => {
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 0,
        completedTasksCount: 0,
        errorTasksCount: 0,
        timeRange: '24h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      await service.getMetrics();

      expect(mockMetricsDataPort.getWebCrawlMetrics).toHaveBeenCalledWith(
        metricsConfig.defaultTimeRangeHours
      );
    });

    it('should prioritize provided params over defaults', async () => {
      const params: MetricsQueryParams = { hours: 48 };
      const mockMetrics: WebCrawlMetrics = {
        newTasksCount: 0,
        completedTasksCount: 0,
        errorTasksCount: 0,
        timeRange: '48h',
        timestamp: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockMetricsDataPort.getWebCrawlMetrics.mockResolvedValue(mockMetrics);

      await service.getMetrics(params);

      expect(mockMetricsDataPort.getWebCrawlMetrics).toHaveBeenCalledWith(48);
    });
  });
});

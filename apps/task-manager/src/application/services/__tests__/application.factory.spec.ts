import { ApplicationFactory } from '../application.factory';
import { IWebCrawlMetricsDataPort } from '../../metrics/ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetricsService } from '../../metrics/services/WebCrawlMetricsService';
import { IWebCrawlTaskRepositoryPort } from '../../../infrastructure/ports/web-crawl-task-repository.port';
import { WebCrawlTaskManagerService } from '../web-crawl-task-manager.service';

// Mock logger
jest.mock('../../../common/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe('ApplicationFactory', () => {
  describe('createWebCrawlMetricsService', () => {
    it('should create WebCrawlMetricsService with injected data port', () => {
      const mockMetricsDataPort: IWebCrawlMetricsDataPort = {
        getWebCrawlMetrics: jest.fn(),
        getNewTasksCount: jest.fn(),
        getCompletedTasksCount: jest.fn(),
        getErrorTasksCount: jest.fn(),
      };

      const service =
        ApplicationFactory.createWebCrawlMetricsService(mockMetricsDataPort);

      expect(service).toBeInstanceOf(WebCrawlMetricsService);
    });

    it('should log debug message when creating service', () => {
      const { logger } = require('../../../common/utils/logger');
      const mockMetricsDataPort: IWebCrawlMetricsDataPort = {
        getWebCrawlMetrics: jest.fn(),
        getNewTasksCount: jest.fn(),
        getCompletedTasksCount: jest.fn(),
        getErrorTasksCount: jest.fn(),
      };

      ApplicationFactory.createWebCrawlMetricsService(mockMetricsDataPort);

      expect(logger.debug).toHaveBeenCalledWith(
        'Creating WebCrawlMetricsService'
      );
    });

    it('should return service that can be used for metrics operations', async () => {
      const mockMetricsDataPort: IWebCrawlMetricsDataPort = {
        getWebCrawlMetrics: jest.fn().mockResolvedValue({
          newTasksCount: 5,
          completedTasksCount: 15,
          errorTasksCount: 2,
          timeRange: '24h',
          timestamp: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        }),
        getNewTasksCount: jest.fn(),
        getCompletedTasksCount: jest.fn(),
        getErrorTasksCount: jest.fn(),
      };

      const service =
        ApplicationFactory.createWebCrawlMetricsService(mockMetricsDataPort);

      const metrics = await service.getMetrics();

      expect(metrics.newTasksCount).toBe(5);
      expect(metrics.completedTasksCount).toBe(15);
      expect(metrics.errorTasksCount).toBe(2);
    });
  });

  describe('createWebCrawlTaskManager', () => {
    it('should create WebCrawlTaskManagerService with injected repository', () => {
      const mockRepository: IWebCrawlTaskRepositoryPort = {
        createTask: jest.fn(),
        getTaskById: jest.fn(),
        updateTaskStatus: jest.fn(),
        getAllTasks: jest.fn(),
      };

      const service =
        ApplicationFactory.createWebCrawlTaskManager(mockRepository);

      expect(service).toBeInstanceOf(WebCrawlTaskManagerService);
    });

    it('should log debug message when creating task manager', () => {
      const { logger } = require('../../../common/utils/logger');
      const mockRepository: IWebCrawlTaskRepositoryPort = {
        createTask: jest.fn(),
        getTaskById: jest.fn(),
        updateTaskStatus: jest.fn(),
        getAllTasks: jest.fn(),
      };

      ApplicationFactory.createWebCrawlTaskManager(mockRepository);

      expect(logger.debug).toHaveBeenCalledWith(
        'Creating WebCrawlTaskManagerService'
      );
    });
  });
});

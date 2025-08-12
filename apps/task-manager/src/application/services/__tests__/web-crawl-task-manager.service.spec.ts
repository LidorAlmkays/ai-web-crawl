import { WebCrawlTaskManagerService } from '../web-crawl-task-manager.service';
import { IWebCrawlTaskRepositoryPort } from '../../../infrastructure/ports/web-crawl-task-repository.port';
import { WebCrawlTask } from '../../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../../common/enums/task-status.enum';

// Mock the logger to avoid winston issues in tests
jest.mock('../../../common/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the repository
const mockRepository: jest.Mocked<IWebCrawlTaskRepositoryPort> = {
  createWebCrawlTask: jest.fn(),
  updateWebCrawlTask: jest.fn(),
  findWebCrawlTaskById: jest.fn(),
  findWebCrawlTasksByStatus: jest.fn(),
  findWebCrawlTasksByUserEmail: jest.fn(),
  findAllWebCrawlTasks: jest.fn(),
  countWebCrawlTasksByStatus: jest.fn(),
  countAllWebCrawlTasks: jest.fn(),
};

describe('WebCrawlTaskManagerService', () => {
  let service: WebCrawlTaskManagerService;

  beforeEach(() => {
    service = new WebCrawlTaskManagerService(mockRepository);
    jest.clearAllMocks();
  });

  describe('createWebCrawlTask', () => {
    it('should create a web crawl task with valid UUID', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID
      const userEmail = 'test@example.com';
      const userQuery = 'test query';
      const originalUrl = 'https://example.com';

      const mockTask = new WebCrawlTask(
        taskId,
        userEmail,
        userQuery,
        originalUrl,
        new Date(),
        TaskStatus.NEW,
        new Date(),
        new Date()
      );

      mockRepository.createWebCrawlTask.mockResolvedValue(mockTask);

      // Act
      const result = await service.createWebCrawlTask(
        taskId,
        userEmail,
        userQuery,
        originalUrl
      );

      // Assert
      expect(mockRepository.createWebCrawlTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          userEmail,
          userQuery,
          originalUrl,
          status: TaskStatus.NEW,
        })
      );
      expect(result).toBe(mockTask);
    });

    it('should use provided task IDs correctly', async () => {
      // Arrange
      const taskId1 = '123e4567-e89b-12d3-a456-426614174000';
      const taskId2 = '987fcdeb-51a2-43c1-b567-789012345678';
      const userEmail = 'test@example.com';
      const userQuery = 'test query';
      const originalUrl = 'https://example.com';

      const mockTask1 = new WebCrawlTask(
        taskId1,
        userEmail,
        userQuery,
        originalUrl,
        new Date(),
        TaskStatus.NEW,
        new Date(),
        new Date()
      );

      const mockTask2 = new WebCrawlTask(
        taskId2,
        userEmail,
        userQuery,
        originalUrl,
        new Date(),
        TaskStatus.NEW,
        new Date(),
        new Date()
      );

      mockRepository.createWebCrawlTask
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);

      // Act
      const result1 = await service.createWebCrawlTask(
        taskId1,
        userEmail,
        userQuery,
        originalUrl
      );
      const result2 = await service.createWebCrawlTask(
        taskId2,
        userEmail,
        userQuery,
        originalUrl
      );

      // Assert
      expect(result1.id).toBe(taskId1);
      expect(result2.id).toBe(taskId2);
      expect(result1.id).not.toBe(result2.id);
    });
  });
});

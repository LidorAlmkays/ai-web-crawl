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
    it('should create a web crawl task letting DB generate UUID', async () => {
      const generatedId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'test query';
      const originalUrl = 'https://example.com';

      const mockTask = new WebCrawlTask(
        generatedId,
        userEmail,
        userQuery,
        originalUrl,
        new Date(),
        TaskStatus.NEW,
        new Date(),
        new Date()
      );

      mockRepository.createWebCrawlTask.mockResolvedValue(mockTask);

      const result = await service.createWebCrawlTask(
        userEmail,
        userQuery,
        originalUrl
      );

      expect(mockRepository.createWebCrawlTask).toHaveBeenCalledWith(
        userEmail,
        userQuery,
        originalUrl,
        expect.any(Date)
      );
      expect(result).toBe(mockTask);
    });
  });
});

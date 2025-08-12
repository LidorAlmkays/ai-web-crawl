import { ProcessCrawlResponseService } from '../process-crawl-response.service';
import { ICrawlRequestRepositoryPort } from '../../ports/crawl-request-repository.port';
import { IUserNotificationPort } from '../../../infrastructure/ports/user-notification.port';
import { IConnectionManagerPort } from '../../ports/connection-manager.port';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';
import { CrawlStatus } from '../../../domain/enums/crawl-status.enum';
import { WebSocket } from 'ws';

describe('ProcessCrawlResponseService', () => {
  let service: ProcessCrawlResponseService;
  let crawlRequestRepository: jest.Mocked<ICrawlRequestRepositoryPort>;
  let connectionManager: jest.Mocked<IConnectionManagerPort>;
  let userNotification: jest.Mocked<IUserNotificationPort>;

  beforeEach(() => {
    crawlRequestRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    connectionManager = {
      add: jest.fn(),
      remove: jest.fn(),
      getConnectionByEmail: jest.fn(),
      getEmailByConnection: jest.fn(),
    };
    userNotification = {
      send: jest.fn(),
    };

    service = new ProcessCrawlResponseService(
      crawlRequestRepository,
      connectionManager,
      userNotification
    );
  });

  const crawlRequest = new CrawlRequest({
    id: 'test-id',
    email: 'test@example.com',
    url: 'https://example.com',
  });

  const responseData = {
    id: crawlRequest.id,
    email: crawlRequest.email,
    url: crawlRequest.url,
    success: true,
    result: { message: 'Crawl successful' },
  };

  it('should update request and notify user if online', async () => {
    crawlRequestRepository.findById.mockResolvedValue(crawlRequest);
    const mockConnection = {} as WebSocket;
    connectionManager.getConnectionByEmail.mockReturnValue(mockConnection);

    await service.execute(responseData);

    expect(crawlRequestRepository.findById).toHaveBeenCalledWith(
      crawlRequest.email,
      crawlRequest.id
    );
    expect(crawlRequestRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CrawlStatus.COMPLETED,
        result: responseData.result,
      })
    );
    expect(connectionManager.getConnectionByEmail).toHaveBeenCalledWith(
      crawlRequest.email
    );
    expect(userNotification.send).toHaveBeenCalledWith(mockConnection, {
      event: 'crawl_update',
      data: expect.any(Object),
    });
  });

  it('should update request but not notify if user is offline', async () => {
    crawlRequestRepository.findById.mockResolvedValue(crawlRequest);
    connectionManager.getConnectionByEmail.mockReturnValue(undefined);

    await service.execute(responseData);

    expect(crawlRequestRepository.findById).toHaveBeenCalledWith(
      crawlRequest.email,
      crawlRequest.id
    );
    expect(crawlRequestRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CrawlStatus.COMPLETED,
      })
    );
    expect(connectionManager.getConnectionByEmail).toHaveBeenCalledWith(
      crawlRequest.email
    );
    expect(userNotification.send).not.toHaveBeenCalled();
  });

  it('should do nothing if request is not found', async () => {
    crawlRequestRepository.findById.mockResolvedValue(null);
    await service.execute(responseData);

    expect(crawlRequestRepository.findById).toHaveBeenCalledWith(
      crawlRequest.email,
      crawlRequest.id
    );
    expect(crawlRequestRepository.update).not.toHaveBeenCalled();
    expect(connectionManager.getConnectionByEmail).not.toHaveBeenCalled();
    expect(userNotification.send).not.toHaveBeenCalled();
  });

  it('should mark request as failed on unsuccessful response', async () => {
    crawlRequestRepository.findById.mockResolvedValue(crawlRequest);
    const errorResponse = {
      ...responseData,
      success: false,
      result: undefined,
      errorMessage: 'Crawl failed',
    };
    await service.execute(errorResponse);
    expect(crawlRequestRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CrawlStatus.FAILED,
        result: { error: 'Crawl failed' },
      })
    );
  });
});

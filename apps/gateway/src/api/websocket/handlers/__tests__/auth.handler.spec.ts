import { AuthHandler } from '../auth.handler';
import { IConnectionManagerPort } from '../../../../application/ports/connection-manager.port';
import { ICrawlRequestRepositoryPort } from '../../../../application/ports/crawl-request-repository.port';
import { IUserNotificationPort } from '../../../../infrastructure/ports/user-notification.port';
import { WebSocket } from 'ws';
import { CrawlRequest } from '../../../../domain/entities/crawl-request.entity';

// Mock WebSocket
class MockWebSocket {
  close = jest.fn();
}

describe('AuthHandler', () => {
  let handler: AuthHandler;
  let connectionManager: jest.Mocked<IConnectionManagerPort>;
  let crawlRequestRepository: jest.Mocked<ICrawlRequestRepositoryPort>;
  let userNotification: jest.Mocked<IUserNotificationPort>;

  beforeEach(() => {
    connectionManager = {
      add: jest.fn(),
      remove: jest.fn(),
      getConnectionByEmail: jest.fn(),
      getEmailByConnection: jest.fn(),
    };
    crawlRequestRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    userNotification = {
      send: jest.fn(),
    };
    handler = new AuthHandler(
      connectionManager,
      crawlRequestRepository,
      userNotification
    );
  });

  it('should close connection on invalid auth DTO', async () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const invalidData = { email: 'not-an-email' };

    await handler.handle(ws, invalidData);

    expect(ws.close).toHaveBeenCalledWith(4000, expect.any(String));
    expect(connectionManager.add).not.toHaveBeenCalled();
  });

  it('should add connection and send existing requests on valid auth', async () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    const existingRequest = new CrawlRequest({
      email,
      url: 'https://test.com',
    });
    crawlRequestRepository.findByEmail.mockResolvedValue([existingRequest]);

    await handler.handle(ws, { email });

    expect(connectionManager.add).toHaveBeenCalledWith(email, ws);
    expect(crawlRequestRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(userNotification.send).toHaveBeenCalledWith(ws, {
      event: 'crawl_update',
      data: existingRequest.toJSON(),
    });
  });

  it('should handle users with no existing requests gracefully', async () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'new@example.com';
    crawlRequestRepository.findByEmail.mockResolvedValue([]);

    await handler.handle(ws, { email });

    expect(connectionManager.add).toHaveBeenCalledWith(email, ws);
    expect(crawlRequestRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(userNotification.send).not.toHaveBeenCalled();
  });
});

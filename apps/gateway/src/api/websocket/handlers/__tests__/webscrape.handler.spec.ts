import { WebscrapeHandler } from '../webscrape.handler';
import { IWebscrapePort } from '../../../../application/ports/webscrape.port';
import { WebSocket } from 'ws';

// Mock WebSocket
class MockWebSocket {
  send = jest.fn();
}

describe('WebscrapeHandler', () => {
  let handler: WebscrapeHandler;
  let webscrapeService: jest.Mocked<IWebscrapePort>;

  beforeEach(() => {
    webscrapeService = {
      execute: jest.fn(),
    };
    handler = new WebscrapeHandler(webscrapeService);
  });

  it('should call the webscrape service on valid payload', async () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    const data = { url: 'https://example.com' };

    await handler.handle(email, data, ws);

    expect(webscrapeService.execute).toHaveBeenCalledWith({
      email,
      url: data.url,
    });
  });

  it('should send an error and not call the service on invalid payload', async () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    const data = { url: 'invalid-url' };

    await handler.handle(email, data, ws);

    expect(webscrapeService.execute).not.toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'error',
        message: expect.stringContaining('Invalid payload'),
      })
    );
  });
});

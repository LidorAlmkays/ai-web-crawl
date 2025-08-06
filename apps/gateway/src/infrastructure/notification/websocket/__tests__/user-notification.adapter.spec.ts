import { WebSocketUserNotificationAdapter } from '../user-notification.adapter';
import { WebSocketServerManager } from '../../../../common/clients/websocket-server';
import { IWebSocketMessage } from '../../../../common/types';

// Mock the WebSocketServerManager
jest.mock('../../../../common/clients/websocket-server');

describe('WebSocketUserNotificationAdapter', () => {
  let adapter: WebSocketUserNotificationAdapter;
  let webSocketManager: jest.Mocked<WebSocketServerManager>;

  beforeEach(() => {
    // Manually create a mocked instance
    webSocketManager = {
      sendMessage: jest.fn(),
    } as any;

    adapter = new WebSocketUserNotificationAdapter(webSocketManager);
  });

  it('should call sendMessage on the webSocketManager', async () => {
    const connectionId = 'conn-123';
    const message: IWebSocketMessage = { type: 'test', data: 'hello' };

    await adapter.send(connectionId, message);

    expect(webSocketManager.sendMessage).toHaveBeenCalledWith(
      connectionId,
      message
    );
    expect(webSocketManager.sendMessage).toHaveBeenCalledTimes(1);
  });
});

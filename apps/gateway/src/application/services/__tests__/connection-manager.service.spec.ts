import { WebSocket } from 'ws';
import { ConnectionManagerService } from '../connection-manager.service';

// Mock WebSocket
class MockWebSocket {
  terminate = jest.fn();
  close = jest.fn();
}

describe('ConnectionManagerService', () => {
  let service: ConnectionManagerService;

  beforeEach(() => {
    service = new ConnectionManagerService();
  });

  it('should add a new connection', () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    service.add(email, ws);

    expect(service.getConnectionByEmail(email)).toBe(ws);
    expect(service.getEmailByConnection(ws)).toBe(email);
  });

  it('should remove a connection', () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    service.add(email, ws);
    service.remove(ws);

    expect(service.getConnectionByEmail(email)).toBeUndefined();
    expect(service.getEmailByConnection(ws)).toBeUndefined();
  });

  it('should handle removing a non-existent connection gracefully', () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    expect(() => service.remove(ws)).not.toThrow();
  });

  it('should terminate an old connection when a new one is added for the same email', () => {
    const email = 'test@example.com';
    const oldWs = new MockWebSocket() as unknown as WebSocket;
    const newWs = new MockWebSocket() as unknown as WebSocket;

    service.add(email, oldWs);
    service.add(email, newWs);

    expect(oldWs.terminate).toHaveBeenCalled();
    expect(service.getConnectionByEmail(email)).toBe(newWs);
    expect(service.getEmailByConnection(oldWs)).toBeUndefined();
    expect(service.getEmailByConnection(newWs)).toBe(email);
  });

  it('should retrieve connection by email', () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    service.add(email, ws);

    const foundWs = service.getConnectionByEmail(email);
    expect(foundWs).toBe(ws);
  });

  it('should retrieve email by connection', () => {
    const ws = new MockWebSocket() as unknown as WebSocket;
    const email = 'test@example.com';
    service.add(email, ws);

    const foundEmail = service.getEmailByConnection(ws);
    expect(foundEmail).toBe(email);
  });
});

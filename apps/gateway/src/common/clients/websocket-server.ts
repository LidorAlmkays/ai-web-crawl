import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import { serverConfig } from '../../config/server';

/**
 * Centralized WebSocket Server Manager
 * Implements a singleton pattern to ensure a single WebSocket server instance
 * across the entire application.
 */
export class WebSocketServerManager {
  private wss: WebSocketServer;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    logger.info(`WebSocket server started on port ${port}`);
  }

  public getWss(): WebSocketServer {
    return this.wss;
  }

  public close(): void {
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}

// Export singleton instance
export const webSocketServerManager = new WebSocketServerManager(
  serverConfig.websocketPort
);

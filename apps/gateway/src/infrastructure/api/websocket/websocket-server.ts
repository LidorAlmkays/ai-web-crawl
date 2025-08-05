import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../../../common/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface CrawlRequestMessage {
  type: 'crawl_request';
  url: string;
  query: string;
  userId: string;
}

export interface CrawlStatusMessage {
  type: 'crawl_status';
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

export class WebSocketServerManager extends EventEmitter {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, string[]> = new Map(); // userId -> connectionIds[]

  constructor(port: number = 8081) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();

    logger.info('WebSocket server started', { port });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const connectionId = uuidv4();
      const connection: WebSocketConnection = {
        id: connectionId,
        ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.connections.set(connectionId, connection);
      logger.info('WebSocket client connected', { connectionId });

      // Send connection confirmation
      this.sendMessage(connectionId, {
        type: 'connection_established',
        connectionId,
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', {
            connectionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(connectionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket connection error', {
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.handleDisconnect(connectionId);
      });
    });
  }

  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Received message for unknown connection', { connectionId });
      return;
    }

    connection.lastActivity = new Date();

    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(connectionId, message);
        break;
      case 'crawl_request':
        this.handleCrawlRequest(connectionId, message);
        break;
      case 'ping':
        this.sendMessage(connectionId, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;
      default:
        logger.warn('Unknown message type', {
          connectionId,
          messageType: message.type,
        });
    }
  }

  private handleAuthentication(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { userId } = message;
    if (!userId) {
      this.sendMessage(connectionId, {
        type: 'error',
        message: 'User ID is required for authentication',
      });
      return;
    }

    // Update connection with user ID
    connection.userId = userId;

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, []);
    }
    this.userConnections.get(userId)!.push(connectionId);

    logger.info('User authenticated via WebSocket', { connectionId, userId });

    this.sendMessage(connectionId, {
      type: 'authenticated',
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleCrawlRequest(
    connectionId: string,
    message: CrawlRequestMessage
  ): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) {
      this.sendMessage(connectionId, {
        type: 'error',
        message: 'Authentication required before submitting crawl requests',
      });
      return;
    }

    // Validate crawl request
    if (!message.url || !message.query) {
      this.sendMessage(connectionId, {
        type: 'error',
        message: 'URL and query are required for crawl requests',
      });
      return;
    }

    // Emit crawl request event for processing
    this.emit('crawl_request', {
      connectionId,
      userId: connection.userId,
      url: message.url,
      query: message.query,
    });

    // Send acknowledgment
    this.sendMessage(connectionId, {
      type: 'crawl_request_received',
      url: message.url,
      query: message.query,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections
    if (connection.userId) {
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        const index = userConnections.indexOf(connectionId);
        if (index > -1) {
          userConnections.splice(index, 1);
          if (userConnections.length === 0) {
            this.userConnections.delete(connection.userId);
          }
        }
      }
    }

    this.connections.delete(connectionId);
    logger.info('WebSocket client disconnected', {
      connectionId,
      userId: connection.userId,
    });
  }

  public sendMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Attempted to send message to unknown connection', {
        connectionId,
      });
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send WebSocket message', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleDisconnect(connectionId);
    }
  }

  public sendToUser(userId: string, message: any): void {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) {
      logger.warn('No active connections for user', { userId });
      return;
    }

    userConnections.forEach((connectionId) => {
      this.sendMessage(connectionId, message);
    });
  }

  public broadcast(message: any): void {
    this.connections.forEach((connection, connectionId) => {
      this.sendMessage(connectionId, message);
    });
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getUserConnectionCount(userId: string): number {
    const userConnections = this.userConnections.get(userId);
    return userConnections ? userConnections.length : 0;
  }

  public close(): void {
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}

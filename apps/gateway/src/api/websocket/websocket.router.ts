import { WebSocketServer, WebSocket } from 'ws';
import { IConnectionManagerPort } from '../../application/ports/connection-manager.port';
import { AuthHandler } from './handlers/auth.handler';
import { WebscrapeHandler } from './handlers/webscrape.handler';
import { logger } from '../../common/utils/logger';

export function setupWebSocketRoutes(
  wss: WebSocketServer,
  connectionManager: IConnectionManagerPort,
  authHandler: AuthHandler,
  webscrapeHandler: WebscrapeHandler
): void {
  wss.on('connection', (ws: WebSocket) => {
    logger.info('Client connected');

    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message);
        const { event, data } = parsedMessage;

        if (event === 'auth') {
          await authHandler.handle(ws, data);
        } else {
          const email = connectionManager.getEmailByConnection(ws);
          if (!email) {
            logger.error(
              'Unauthenticated client sent a message. Closing connection.'
            );
            ws.close(4001, 'Unauthorized');
            return;
          }

          // Route to other handlers based on event
          switch (event) {
            case 'submit_crawl':
              await webscrapeHandler.handle(email, data, ws);
              break;
            default:
              logger.warn(`Unknown event type received: ${event}`);
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: `Unknown event: ${event}`,
                })
              );
          }
        }
      } catch (error) {
        logger.error('Failed to process message', { error });
        ws.send(
          JSON.stringify({ event: 'error', message: 'Invalid message format' })
        );
      }
    });

    ws.on('close', () => {
      logger.info('Client disconnected');
      connectionManager.remove(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error occurred', { error });
      connectionManager.remove(ws);
    });
  });
}

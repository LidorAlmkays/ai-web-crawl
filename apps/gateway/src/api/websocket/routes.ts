import { registerWebSocketHandler } from './websocket.router';
import { WebscrapeHandler } from './handlers/webscrape.handler';
import { IWebscrapePort } from '../../application/ports/webscrape.port';

/**
 * Sets up and registers all WebSocket message handlers for the application.
 *
 * @param {IWebscrapePort} webscrapeService - The webscrape application service instance.
 */
export function setupWebSocketRoutes(webscrapeService: IWebscrapePort): void {
  // Instantiate handlers
  const webscrapeHandler = new WebscrapeHandler(webscrapeService);

  // Register handlers
  registerWebSocketHandler(
    'webscrape',
    webscrapeHandler.handle.bind(webscrapeHandler)
  );
  // Future handlers can be registered here
  // e.g., registerWebSocketHandler('another-event', anotherHandler.handle.bind(anotherHandler));
}

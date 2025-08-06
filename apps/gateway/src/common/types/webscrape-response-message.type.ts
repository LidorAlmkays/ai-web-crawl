import { IWebSocketMessage } from './websocket-message.type';

/**
 * Defines the structure for the data payload of a webscrape result message.
 */
interface IWebscrapeResultData {
  originalUrl: string;
  success: boolean;
  scrapedData: string; // Changed to string
  errorMessage?: string;
}

/**
 * Defines the structure for a response message sent back to the client
 * with the final result of a webscrape process.
 */
export interface IWebscrapeResponseMessage extends IWebSocketMessage {
  type: 'webscrape_result';
  data: IWebscrapeResultData;
}

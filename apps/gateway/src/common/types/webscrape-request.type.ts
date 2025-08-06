/**
 * Represents the data structure for a webscrape request received via WebSocket.
 */
export interface IWebscrapeRequest {
  query: string;
  url: string;
  userId?: string;
}

/**
 * Defines the port for the main webscrape use case.
 * The API layer will call this port to initiate a webscrape.
 */
export interface IWebscrapePort {
  execute(
    data: { query: string; url: string; userId?: string },
    connectionId: string
  ): Promise<void>;
}

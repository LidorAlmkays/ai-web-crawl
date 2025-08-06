/**
 * Port for publishing crawl requests to the messaging infrastructure.
 */
export interface ICrawlRequestPublisherPort {
  publish(data: { hash: string; query: string; url: string }): Promise<void>;
}

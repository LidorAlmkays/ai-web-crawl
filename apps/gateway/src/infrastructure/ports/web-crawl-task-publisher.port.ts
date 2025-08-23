import { TraceContext } from '../../common/types/trace-context.type';

/**
 * Infrastructure port interface for web crawl task publishing
 * Defines the contract for publishing web crawl tasks to external systems (e.g., Kafka)
 */
export interface IWebCrawlTaskPublisherPort {
  /**
   * Publish a new web crawl task
   * @param userEmail - The email of the user making the request
   * @param query - The search query for the web crawl
   * @param originalUrl - The original URL to crawl
   * @param traceContext - The trace context for distributed tracing
   * @returns Promise that resolves when the task is published
   */
  publishNewTask(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void>;
}

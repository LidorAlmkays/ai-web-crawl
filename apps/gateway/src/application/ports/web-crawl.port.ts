import { TraceContext } from '../../common/types/trace-context.type';

/**
 * Port interface for web crawl operations
 * Defines the contract for web crawl business logic
 */
export interface IWebCrawlPort {
  /**
   * Submit a new web crawl request
   * @param userEmail - The email of the user making the request
   * @param query - The search query for the web crawl
   * @param originalUrl - The original URL to crawl
   * @param traceContext - The trace context for distributed tracing
   * @returns Promise resolving to the response message and status
   */
  submitWebCrawlRequest(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<{ message: string; status: string }>;
}

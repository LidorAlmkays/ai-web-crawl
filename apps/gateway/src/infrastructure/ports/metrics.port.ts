/**
 * Infrastructure port interface for metrics collection
 * Defines the contract for collecting and exposing metrics
 */
export interface IMetricsPort {
  /**
   * Increment request counter for an endpoint
   * @param endpoint - The endpoint path
   * @param method - The HTTP method
   * @param statusCode - The HTTP status code
   */
  incrementRequestCounter(endpoint: string, method: string, statusCode: number): void;

  /**
   * Record request duration
   * @param endpoint - The endpoint path
   * @param method - The HTTP method
   * @param durationMs - The request duration in milliseconds
   */
  recordRequestDuration(endpoint: string, method: string, durationMs: number): void;

  /**
   * Increment web crawl request counter
   */
  incrementWebCrawlRequestCounter(): void;

  /**
   * Record web crawl processing time
   * @param durationMs - The processing time in milliseconds
   */
  recordWebCrawlProcessingTime(durationMs: number): void;

  /**
   * Get metrics data in Prometheus format
   * @returns Metrics data as a string in Prometheus exposition format
   */
  getMetricsData(): string;
}

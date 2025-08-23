import { IMetricsPort } from '../ports/metrics.port';
import { logger } from '../../common/utils/logger';

/**
 * Simple local metrics adapter
 * Tracks basic request counts for the gateway service
 */
export class LocalMetricsAdapter implements IMetricsPort {
  private webCrawlRequestCounter: number = 0;

  /**
   * Increment the request counter (not used for now)
   */
  public incrementRequestCounter(endpoint: string, method: string, statusCode: number): void {
    // Not implemented - keeping interface compatibility
  }

  /**
   * Record request duration (not used for now)
   */
  public recordRequestDuration(endpoint: string, method: string, duration: number): void {
    // Not implemented - keeping interface compatibility
  }

  /**
   * Increment the web crawl request counter
   */
  public incrementWebCrawlRequestCounter(): void {
    this.webCrawlRequestCounter++;
    logger.info('Web crawl request counter incremented', {
      totalRequests: this.webCrawlRequestCounter,
    });
  }

  /**
   * Record web crawl request processing time (not used for now)
   */
  public recordWebCrawlProcessingTime(duration: number): void {
    // Not implemented - keeping interface compatibility
  }

  /**
   * Get metrics data in Prometheus exposition format
   */
  public getMetricsData(): string {
    return `# HELP gateway_web_crawl_requests_total Total number of web crawl requests processed
# TYPE gateway_web_crawl_requests_total counter
gateway_web_crawl_requests_total ${this.webCrawlRequestCounter}`;
  }

  /**
   * Get the current web crawl request count
   */
  public getWebCrawlRequestCount(): number {
    return this.webCrawlRequestCounter;
  }

  /**
   * Reset metrics (useful for testing)
   */
  public reset(): void {
    this.webCrawlRequestCounter = 0;
    logger.info('Metrics reset');
  }
}

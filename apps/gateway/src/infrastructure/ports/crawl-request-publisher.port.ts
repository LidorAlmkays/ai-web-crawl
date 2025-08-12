import { CrawlRequest } from '../../domain/entities/crawl-request.entity';

/**
 * Port for publishing crawl requests to the messaging infrastructure.
 */
export interface ICrawlRequestPublisherPort {
  publish(data: ReturnType<CrawlRequest['toJSON']>): Promise<void>;
}

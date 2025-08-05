import { CrawlRequest } from '../../domain/crawl-request.entity';

export interface ICrawlRequestPublisherPort {
  publishCrawlRequest(crawlRequest: CrawlRequest): Promise<void>;
}

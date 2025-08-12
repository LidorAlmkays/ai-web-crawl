import { IWebscrapePort } from '../ports/webscrape.port';
import { ICrawlRequestPublisherPort } from '../../infrastructure/ports/crawl-request-publisher.port';
import { ICrawlRequestRepositoryPort } from '../ports/crawl-request-repository.port';
import { logger } from '../../common/utils/logger';
import { CrawlRequest } from '../../domain/entities/crawl-request.entity';

export class WebscrapeService implements IWebscrapePort {
  constructor(
    private readonly crawlRequestRepository: ICrawlRequestRepositoryPort,
    private readonly crawlRequestPublisher: ICrawlRequestPublisherPort
  ) {}

  async execute(data: { url: string; email: string }): Promise<void> {
    logger.info('Starting webscrape execution', { ...data });

    const crawlRequest = new CrawlRequest({
      url: data.url,
      email: data.email,
    });

    await this.crawlRequestRepository.save(crawlRequest);
    logger.info(
      `Saved crawl request ${crawlRequest.id} for user ${data.email}`
    );

    await this.crawlRequestPublisher.publish(crawlRequest.toJSON());

    logger.info(`Successfully published crawl request ${crawlRequest.id}`);
  }
}

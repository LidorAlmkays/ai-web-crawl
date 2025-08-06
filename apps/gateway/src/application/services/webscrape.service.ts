import { IWebscrapePort } from '../ports/webscrape.port';
import { IHashPort } from '../ports/hash.port';
import { ICrawlRequestPublisherPort } from '../../infrastructure/ports/crawl-request-publisher.port';
import { ICrawlStateRepositoryPort } from '../../infrastructure/ports/crawl-state-repository.port';
import { CrawlState } from '../../domain/entities/crawl-state.entity';
import { logger } from '../../common/utils/logger';
import { CrawlRequest } from '../../domain/entities/crawl-request.entity';

export class WebscrapeService implements IWebscrapePort {
  constructor(
    private readonly hashService: IHashPort,
    private readonly crawlStateRepository: ICrawlStateRepositoryPort,
    private readonly crawlRequestPublisher: ICrawlRequestPublisherPort
  ) {}

  async execute(
    data: { query: string; url: string; userId?: string },
    connectionId: string
  ): Promise<void> {
    logger.info('Starting webscrape execution', { ...data, connectionId });

    // Create a domain entity from the input data
    const crawlRequest = new CrawlRequest({
      url: data.url,
      query: data.query,
      userId: data.userId,
    });

    const hash = this.hashService.generate(crawlRequest.getHashableContent());
    crawlRequest.setHash(hash);
    logger.info('Generated hash for request', { hash });

    const crawlState = new CrawlState({ hash, connectionId });
    await this.crawlStateRepository.save(crawlState);
    logger.info('Saved crawl state', { hash, connectionId });

    await this.crawlRequestPublisher.publish({
      hash: crawlRequest.getHash(),
      query: crawlRequest.query,
      url: crawlRequest.url,
    });

    logger.info('Successfully published crawl request', { hash });
  }
}

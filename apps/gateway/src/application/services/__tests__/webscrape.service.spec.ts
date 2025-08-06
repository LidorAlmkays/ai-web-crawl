import { WebscrapeService } from '../webscrape.service';
import { IHashPort } from '../../ports/hash.port';
import { ICrawlStateRepositoryPort } from '../../../infrastructure/ports/crawl-state-repository.port';
import { ICrawlRequestPublisherPort } from '../../../infrastructure/ports/crawl-request-publisher.port';
import { CrawlState } from '../../../domain/entities/crawl-state.entity';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';

describe('WebscrapeService', () => {
  let webscrapeService: WebscrapeService;
  let hashService: IHashPort;
  let crawlStateRepository: ICrawlStateRepositoryPort;
  let crawlRequestPublisher: ICrawlRequestPublisherPort;

  beforeEach(() => {
    hashService = {
      generate: jest.fn().mockReturnValue('mocked-hash'),
    };
    crawlStateRepository = {
      save: jest.fn(),
      findByHash: jest.fn(),
      delete: jest.fn(),
    };
    crawlRequestPublisher = {
      publish: jest.fn(),
    };

    webscrapeService = new WebscrapeService(
      hashService,
      crawlStateRepository,
      crawlRequestPublisher
    );
  });

  it('should process a webscrape event correctly', async () => {
    const event = { query: 'test', url: 'http://example.com' };
    const connectionId = 'conn-123';

    await webscrapeService.execute(event, connectionId);

    expect(hashService.generate).toHaveBeenCalledWith(
      'test:http://example.com'
    );
    expect(crawlStateRepository.save).toHaveBeenCalledWith(
      expect.any(CrawlState)
    );
    expect(crawlRequestPublisher.publish).toHaveBeenCalledWith(
      expect.any(CrawlRequest)
    );
  });
});

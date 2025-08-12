import { WebscrapeService } from '../webscrape.service';
import { ICrawlRequestRepositoryPort } from '../../ports/crawl-request-repository.port';
import { ICrawlRequestPublisherPort } from '../../../infrastructure/ports/crawl-request-publisher.port';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';

describe('WebscrapeService', () => {
  let webscrapeService: WebscrapeService;
  let crawlRequestRepository: ICrawlRequestRepositoryPort;
  let crawlRequestPublisher: ICrawlRequestPublisherPort;

  beforeEach(() => {
    crawlRequestRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    crawlRequestPublisher = {
      publish: jest.fn(),
    };

    webscrapeService = new WebscrapeService(
      crawlRequestRepository,
      crawlRequestPublisher
    );
  });

  it('should save the crawl request and then publish it', async () => {
    const event = {
      url: 'http://example.com',
      email: 'test@example.com',
    };

    await webscrapeService.execute(event);

    // Check that save was called first
    expect(crawlRequestRepository.save).toHaveBeenCalledWith(
      expect.any(CrawlRequest)
    );

    // Check that publish was called second
    expect(crawlRequestPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        url: event.url,
        email: event.email,
        status: 'pending',
      })
    );

    // Ensure the calls happened in the correct order
    const saveOrder = (crawlRequestRepository.save as jest.Mock).mock
      .invocationCallOrder[0];
    const publishOrder = (crawlRequestPublisher.publish as jest.Mock).mock
      .invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(publishOrder);
  });
});

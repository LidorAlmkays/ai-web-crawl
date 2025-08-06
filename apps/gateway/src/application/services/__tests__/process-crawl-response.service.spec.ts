import { ProcessCrawlResponseService } from '../process-crawl-response.service';
import { ICrawlStateRepositoryPort } from '../../../infrastructure/ports/crawl-state-repository.port';
import { IUserNotificationPort } from '../../../infrastructure/ports/user-notification.port';
import { CrawlState } from '../../../domain/entities/crawl-state.entity';

describe('ProcessCrawlResponseService', () => {
  let service: ProcessCrawlResponseService;
  let crawlStateRepository: ICrawlStateRepositoryPort;
  let userNotification: IUserNotificationPort;

  beforeEach(() => {
    crawlStateRepository = {
      save: jest.fn(),
      findByHash: jest.fn(),
      delete: jest.fn(),
    };
    userNotification = {
      send: jest.fn(),
    };

    service = new ProcessCrawlResponseService(
      crawlStateRepository,
      userNotification
    );
  });

  it('should find state, send notification, and delete state', async () => {
    const state = new CrawlState({
      hash: 'test-hash',
      connectionId: 'conn-123',
    });
    (crawlStateRepository.findByHash as jest.Mock).mockResolvedValue(state);

    await service.execute('test-hash', 'some-result');

    expect(crawlStateRepository.findByHash).toHaveBeenCalledWith('test-hash');
    expect(userNotification.send).toHaveBeenCalledWith('conn-123', {
      type: 'result',
      data: { result: 'some-result' },
    });
    expect(crawlStateRepository.delete).toHaveBeenCalledWith('test-hash');
  });

  it('should do nothing if state is not found', async () => {
    (crawlStateRepository.findByHash as jest.Mock).mockResolvedValue(null);

    await service.execute('not-found-hash', 'some-result');

    expect(crawlStateRepository.findByHash).toHaveBeenCalledWith(
      'not-found-hash'
    );
    expect(userNotification.send).not.toHaveBeenCalled();
    expect(crawlStateRepository.delete).not.toHaveBeenCalled();
  });
});

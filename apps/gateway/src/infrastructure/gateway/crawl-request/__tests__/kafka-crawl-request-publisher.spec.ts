import { KafkaCrawlRequestPublisher } from '../kafka-crawl-request-publisher';
import { CrawlRequest } from '../../../../core/domain/crawl-request.entity';
import { kafkaClientService } from '../../../messaging/kafka/kafka-client.service';

// Mock the Kafka client service
jest.mock('../../../messaging/kafka-client.service', () => ({
  kafkaClientService: {
    getProducer: jest.fn(() => ({
      send: jest.fn(),
    })),
    isConnected: jest.fn(() => false),
    connect: jest.fn(),
  },
}));

describe('KafkaCrawlRequestPublisher', () => {
  let publisher: KafkaCrawlRequestPublisher;
  let mockCrawlRequest: CrawlRequest;

  beforeEach(() => {
    publisher = new KafkaCrawlRequestPublisher();

    // Create a mock crawl request
    mockCrawlRequest = {
      getUrl: jest.fn(() => 'https://example.com'),
      getQuery: jest.fn(() => 'test query'),
      getHash: jest.fn(() => 'test-hash-123'),
      getUsername: jest.fn(() => 'testuser'),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishCrawlRequest', () => {
    it('should publish crawl request with correct message format', async () => {
      const mockProducer = {
        send: jest.fn().mockResolvedValue(undefined),
      };

      (kafkaClientService.getProducer as jest.Mock).mockReturnValue(
        mockProducer
      );
      (kafkaClientService.isConnected as jest.Mock).mockReturnValue(true);

      await publisher.publishCrawlRequest(mockCrawlRequest);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'crawl-requests',
        messages: [
          {
            key: 'test-hash-123',
            value: JSON.stringify({
              url: 'https://example.com',
              query: 'test query',
              hash: 'test-hash-123',
              username: 'testuser',
              timestamp: expect.any(String),
            }),
            headers: {
              'message-type': 'crawl_request',
              source: 'gateway',
            },
          },
        ],
      });
    });

    it('should connect to Kafka if not connected', async () => {
      const mockProducer = {
        send: jest.fn().mockResolvedValue(undefined),
      };

      (kafkaClientService.getProducer as jest.Mock).mockReturnValue(
        mockProducer
      );
      (kafkaClientService.isConnected as jest.Mock).mockReturnValue(false);

      await publisher.publishCrawlRequest(mockCrawlRequest);

      expect(kafkaClientService.connect).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockProducer = {
        send: jest.fn().mockRejectedValue(new Error('Kafka error')),
      };

      (kafkaClientService.getProducer as jest.Mock).mockReturnValue(
        mockProducer
      );
      (kafkaClientService.isConnected as jest.Mock).mockReturnValue(true);

      await expect(
        publisher.publishCrawlRequest(mockCrawlRequest)
      ).rejects.toThrow('Kafka error');
    });
  });
});

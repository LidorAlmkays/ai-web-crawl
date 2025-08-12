import { KafkaCrawlRequestPublisherAdapter } from '../crawl-request.publisher.adapter';
import { KafkaClientService } from '../../../common/clients/kafka-client';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';
import { Producer } from 'kafkajs';

describe('KafkaCrawlRequestPublisherAdapter', () => {
  let adapter: KafkaCrawlRequestPublisherAdapter;
  let kafkaClient: jest.Mocked<KafkaClientService>;
  let kafkaProducer: jest.Mocked<Producer>;

  beforeEach(() => {
    kafkaProducer = {
      send: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    kafkaClient = {
      getProducer: jest.fn().mockReturnValue(kafkaProducer),
    } as any;
    adapter = new KafkaCrawlRequestPublisherAdapter(kafkaClient);
  });

  it('should publish a message with metadata in headers and URL in body', async () => {
    const crawlRequest = new CrawlRequest({
      email: 'test@example.com',
      url: 'https://example.com',
    });
    const requestJson = crawlRequest.toJSON();

    await adapter.publish(requestJson);

    expect(kafkaProducer.send).toHaveBeenCalledWith({
      topic: 'crawl-requests',
      messages: [
        {
          key: requestJson.id,
          value: JSON.stringify({ url: requestJson.url }),
          headers: {
            id: requestJson.id,
            email: requestJson.email,
            createdAt: requestJson.createdAt,
          },
        },
      ],
    });
  });
});

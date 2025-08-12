import { CrawlResponseConsumer } from '../crawl-response.consumer';
import { IKafkaClientService } from '../../../common/interfaces/kafka-client.interface';
import { IProcessCrawlResponsePort } from '../../../application/ports/process-crawl-response.port';
import { EachMessagePayload } from 'kafkajs';

describe('CrawlResponseConsumer', () => {
  let consumer: CrawlResponseConsumer;
  let kafkaClient: jest.Mocked<IKafkaClientService>;
  let processCrawlResponseService: jest.Mocked<IProcessCrawlResponsePort>;

  beforeEach(() => {
    const mockKafkaConsumer = {
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn(),
    };
    kafkaClient = {
      getConsumer: jest.fn().mockReturnValue(mockKafkaConsumer),
    } as any;
    processCrawlResponseService = {
      execute: jest.fn(),
    };

    consumer = new CrawlResponseConsumer(
      kafkaClient,
      processCrawlResponseService
    );
  });

  it('should process a valid message with headers', async () => {
    const messagePayload: EachMessagePayload = {
      topic: 'crawl-responses',
      partition: 0,
      message: {
        key: Buffer.from('test-id'),
        value: Buffer.from(
          JSON.stringify({ success: true, scrapedData: { foo: 'bar' } })
        ),
        headers: {
          id: Buffer.from('test-id'),
          email: Buffer.from('test@example.com'),
        },
      },
    } as any;

    // Manually call handleMessage, since run() is mocked
    await (consumer as any).handleMessage(messagePayload);

    expect(processCrawlResponseService.execute).toHaveBeenCalledWith({
      id: 'test-id',
      email: 'test@example.com',
      success: true,
      result: { foo: 'bar' },
      errorMessage: undefined,
    });
  });

  it('should reject a message with missing headers', async () => {
    const messagePayload: EachMessagePayload = {
      topic: 'crawl-responses',
      partition: 0,
      message: {
        key: Buffer.from('test-id'),
        value: Buffer.from(
          JSON.stringify({ success: true, scrapedData: { foo: 'bar' } })
        ),
        headers: {}, // Missing headers
      },
    } as any;

    await (consumer as any).handleMessage(messagePayload);

    expect(processCrawlResponseService.execute).not.toHaveBeenCalled();
  });
});

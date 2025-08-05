import { KafkaPublisherBase } from '../kafka-publisher.base';
import { IKafkaClientService } from '../kafka-client.service';

// Mock Kafka client service for testing
class MockKafkaClientService implements IKafkaClientService {
  private connected = false;
  private producer: any = { send: jest.fn() };
  private consumer: any = { subscribe: jest.fn(), run: jest.fn() };

  getProducer() {
    return this.producer;
  }

  getConsumer() {
    return this.consumer;
  }

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }
}

// Test implementation of KafkaPublisherBase
class TestPublisher extends KafkaPublisherBase {
  constructor(kafkaClientService: IKafkaClientService) {
    super(kafkaClientService, 'test-topic');
  }

  async publishTestMessage(
    message: any,
    key?: string,
    headers?: Record<string, string>
  ) {
    return this.publishMessage(message, key, headers);
  }
}

describe('KafkaPublisherBase', () => {
  let mockKafkaClientService: MockKafkaClientService;
  let testPublisher: TestPublisher;

  beforeEach(() => {
    mockKafkaClientService = new MockKafkaClientService();
    testPublisher = new TestPublisher(mockKafkaClientService);
  });

  describe('publishMessage', () => {
    it('should connect to Kafka if not connected', async () => {
      const message = { test: 'data' };

      await testPublisher.publishTestMessage(message);

      expect(mockKafkaClientService.isConnected()).toBe(true);
    });

    it('should publish message with correct format', async () => {
      const message = { test: 'data' };
      const key = 'test-key';
      const headers = { 'message-type': 'test' };

      await testPublisher.publishTestMessage(message, key, headers);

      expect(mockKafkaClientService.getProducer().send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [
          {
            key: 'test-key',
            value: JSON.stringify(message),
            headers: { 'message-type': 'test' },
          },
        ],
      });
    });

    it('should use default key and headers if not provided', async () => {
      const message = { test: 'data' };

      await testPublisher.publishTestMessage(message);

      expect(mockKafkaClientService.getProducer().send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [
          {
            key: 'default',
            value: JSON.stringify(message),
            headers: {},
          },
        ],
      });
    });
  });
});

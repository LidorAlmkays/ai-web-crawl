import { KafkaConsumerBase } from '../kafka-consumer.base';
import { IKafkaClientService } from '../kafka-client.service';

// Mock Kafka client service for testing
class MockKafkaClientService implements IKafkaClientService {
  private connected = false;
  private producer: any = { send: jest.fn() };
  private consumer: any = {
    subscribe: jest.fn(),
    run: jest.fn(),
    disconnect: jest.fn(),
  };

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

// Test implementation of KafkaConsumerBase
class TestConsumer extends KafkaConsumerBase {
  constructor(kafkaClientService: IKafkaClientService) {
    super(kafkaClientService, 'test-topic', 'test-group');
  }

  async startTestConsumer(messageHandler: (message: any) => Promise<void>) {
    return this.startConsumer(messageHandler);
  }

  async stopTestConsumer() {
    return this.stopConsumer();
  }
}

describe('KafkaConsumerBase', () => {
  let mockKafkaClientService: MockKafkaClientService;
  let testConsumer: TestConsumer;

  beforeEach(() => {
    mockKafkaClientService = new MockKafkaClientService();
    testConsumer = new TestConsumer(mockKafkaClientService);
  });

  describe('startConsumer', () => {
    it('should connect to Kafka if not connected', async () => {
      const messageHandler = jest.fn();

      await testConsumer.startTestConsumer(messageHandler);

      expect(mockKafkaClientService.isConnected()).toBe(true);
    });

    it('should subscribe to the correct topic', async () => {
      const messageHandler = jest.fn();

      await testConsumer.startTestConsumer(messageHandler);

      expect(
        mockKafkaClientService.getConsumer().subscribe
      ).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false,
      });
    });

    it('should start the consumer with message handler', async () => {
      const messageHandler = jest.fn();

      await testConsumer.startTestConsumer(messageHandler);

      expect(mockKafkaClientService.getConsumer().run).toHaveBeenCalled();
    });
  });

  describe('stopConsumer', () => {
    it('should disconnect the consumer', async () => {
      await testConsumer.stopTestConsumer();

      expect(
        mockKafkaClientService.getConsumer().disconnect
      ).toHaveBeenCalled();
    });
  });
});

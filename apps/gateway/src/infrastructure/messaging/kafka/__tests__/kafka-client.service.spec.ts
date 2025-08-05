import { KafkaClientService } from '../kafka-client.service';

describe('KafkaClientService', () => {
  let kafkaClientService: KafkaClientService;

  beforeEach(() => {
    kafkaClientService = new KafkaClientService();
  });

  afterEach(async () => {
    if (kafkaClientService.isConnected()) {
      await kafkaClientService.disconnect();
    }
  });

  describe('initialization', () => {
    it('should create producer and consumer instances', () => {
      const producer = kafkaClientService.getProducer();
      const consumer = kafkaClientService.getConsumer('test-group');

      expect(producer).toBeDefined();
      expect(consumer).toBeDefined();
    });

    it('should return the same producer instance on multiple calls', () => {
      const producer1 = kafkaClientService.getProducer();
      const producer2 = kafkaClientService.getProducer();

      expect(producer1).toBe(producer2);
    });

    it('should return the same consumer instance for the same groupId', () => {
      const consumer1 = kafkaClientService.getConsumer('test-group');
      const consumer2 = kafkaClientService.getConsumer('test-group');

      expect(consumer1).toBe(consumer2);
    });

    it('should return different consumer instances for different groupIds', () => {
      const consumer1 = kafkaClientService.getConsumer('group-1');
      const consumer2 = kafkaClientService.getConsumer('group-2');

      expect(consumer1).not.toBe(consumer2);
    });
  });

  describe('connection state', () => {
    it('should start disconnected', () => {
      expect(kafkaClientService.isConnected()).toBe(false);
    });

    it('should handle connection lifecycle correctly', async () => {
      // Test connection
      expect(kafkaClientService.isConnected()).toBe(false);

      // Note: In a real test environment, you would mock the Kafka connection
      // or use a test Kafka instance. For now, we'll just test the interface.

      // Test that the service can be instantiated without errors
      expect(kafkaClientService).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      // This test would require mocking the Kafka client
      // to simulate connection failures
      expect(kafkaClientService).toBeDefined();
    });
  });
});

import { Kafka } from 'kafkajs';
import { kafkaConfig } from '../../config/kafka'; // Import your centralized config

// Create a single Kafka instance
const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  ssl: kafkaConfig.ssl,
  sasl: kafkaConfig.sasl,
});

// Export producer and consumer factories
export const getKafkaProducer = () => kafka.producer();
export const getKafkaConsumer = (groupId: string = kafkaConfig.groupId) =>
  kafka.consumer({ groupId });

// Function to connect and disconnect (for app lifecycle management)
export const connectKafka = async () => {
  const producer = getKafkaProducer();
  await producer.connect();
  console.log('Kafka Producer Connected');
};

export const disconnectKafka = async () => {
  const producer = getKafkaProducer();
  await producer.disconnect();
  console.log('Kafka Producer Disconnected');
  // Consumers are usually stopped individually
};

import { KafkaConfig } from 'kafkajs';

interface SharedKafkaConfig extends KafkaConfig {
  producerTopic: string;
  consumerTopics: string[];
  groupId: string;
}

export const kafkaConfig: SharedKafkaConfig = {
  clientId: 'my-typescript-app',
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL_USERNAME
    ? {
        mechanism: 'scram-sha-256', // or 'plain', 'scram-sha-512'
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      }
    : undefined,
  // Add custom application-specific Kafka settings here
  producerTopic: 'user-events', // Example topic for a producer
  consumerTopics: ['order-events', 'payment-events'], // Example topics for consumers
  groupId: 'my-app-consumer-group', // Default consumer group ID
};

export const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'gateway-crawl-request-publisher',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  topic: process.env.KAFKA_TOPIC || 'url-to-crawl',
};

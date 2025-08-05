/**
 * Kafka configuration with specific topic definitions
 */
export const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'gateway-crawl-request-publisher',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  topics: {
    crawlRequestTopic:
      process.env.KAFKA_CRAWL_REQUEST_TOPIC || 'crawl-requests',
    crawlResponseTopic:
      process.env.KAFKA_CRAWL_RESPONSE_TOPIC || 'crawl-responses',
  },
};

/**
 * Kafka topic names for crawl operations
 */
export const kafkaTopics = {
  // Crawl request topic
  CRAWL_REQUESTS: 'crawl-requests',

  // Crawl response topic
  CRAWL_RESPONSES: 'crawl-responses',
} as const;

/**
 * Kafka message types for crawl operations
 */
export const crawlMessageTypes = {
  CRAWL_REQUEST: 'crawl_request',
  CRAWL_RESPONSE: 'crawl_response',
} as const;

/**
 * Kafka configuration for specific environments
 */
export const kafkaEnvironmentConfig = {
  development: {
    clientId: 'gateway-dev',
    brokers: ['localhost:9092'],
    topics: kafkaTopics,
  },
  production: {
    clientId: 'gateway-prod',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topics: kafkaTopics,
  },
  test: {
    clientId: 'gateway-test',
    brokers: ['localhost:9092'],
    topics: kafkaTopics,
  },
};

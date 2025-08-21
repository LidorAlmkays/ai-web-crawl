import { KafkaTopicConfig } from './kafka-topic-config.type';

export interface KafkaTopicsConfig {
	webCrawlRequest: KafkaTopicConfig;
	taskStatus: KafkaTopicConfig;
}

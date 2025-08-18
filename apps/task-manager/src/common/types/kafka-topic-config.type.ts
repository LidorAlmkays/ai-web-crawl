export interface KafkaTopicConfig {
	name: string;
	partitions: number;
	replicationFactor: number;
	retentionMs?: number;
	cleanupPolicy?: string;
}

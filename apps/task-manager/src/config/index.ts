/**
 * Configuration Module Index
 *
 * Central export point for all configuration modules.
 * This provides a clean interface for importing configuration
 * throughout the application.
 *
 * This module serves as the single entry point for all configuration
 * exports, making it easy to import configuration objects and types
 * from a centralized location. It follows the barrel export pattern
 * to simplify imports across the application.
 *
 * All configuration modules use Zod schemas for runtime validation
 * of environment variables and provide TypeScript types for type safety.
 */

export * from './postgres';
export * from './kafka';
export * from './app';
export * from './logger';

// Kafka Topic Configuration - simple dictionary
export { kafkaTopicConfig } from './kafka-topics';

// Logger Level Enum
export { LoggerLevel } from '../common/enums/logger-level.enum';

export type { KafkaTopicsConfig, KafkaTopicConfig as KafkaTopicConfigType, TopicValidationResult } from '../common/types';
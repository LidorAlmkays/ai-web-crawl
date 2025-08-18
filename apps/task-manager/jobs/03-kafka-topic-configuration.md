# Job 03: Kafka Topic Configuration Implementation

## Status

**COMPLETED**

## Overview

Create centralized Kafka topic configuration to support web crawl request publishing and ensure topic names are configurable via environment variables. This job also includes architectural improvements based on feedback.

## Objectives

- Create centralized Kafka topic configuration
- Support configurable topic names via environment variables
- Ensure proper topic naming conventions
- Provide validation and error handling
- **NEW**: Convert logger levels from string union to enum
- **NEW**: Move IWebCrawlMetricsDataPort to infrastructure layer ports

## Files to Create/Modify

### New Files

- `src/config/kafka-topics.ts` - Kafka topic configuration
- `src/config/kafka-topics.spec.ts` - Unit tests for topic configuration
- `src/common/enums/logger-level.enum.ts` - Logger level enum
- `src/infrastructure/ports/web-crawl-metrics-data.port.ts` - Moved metrics port

### Files to Modify

- `src/config/index.ts` - Export topic configuration
- `src/common/types/index.ts` - Add topic-related types
- `src/common/utils/logger.ts` - Update to use logger level enum
- `src/common/utils/logging/index.ts` - Update to use logger level enum
- `src/common/utils/logging/logger-factory.ts` - Update to use logger level enum
- `src/common/utils/logging/otel-logger.ts` - Update to use logger level enum
- `src/application/metrics/ports/IWebCrawlMetricsDataPort.ts` - **REMOVE** (moved to infrastructure)
- `src/application/metrics/services/WebCrawlMetricsService.ts` - Update import path
- `src/application/services/application.factory.ts` - Update import path
- `src/infrastructure/persistence/postgres/postgres.factory.ts` - Update import path
- `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts` - Update import path
- All test files that import the moved port

## Detailed Implementation

### 1. Create Logger Level Enum

**File**: `src/common/enums/logger-level.enum.ts`

```typescript
/**
 * Logger level enumeration
 *
 * Defines the available logging levels for the application.
 * This replaces the string union type for better type safety and maintainability.
 */
export enum LoggerLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
  SUCCESS = 'success',
}

/**
 * Type alias for backward compatibility
 */
export type LoggerLevelType = LoggerLevel;
```

### 2. Move IWebCrawlMetricsDataPort to Infrastructure Layer

**File**: `src/infrastructure/ports/web-crawl-metrics-data.port.ts`

````typescript
import { WebCrawlMetrics } from '../../domain/types/metrics.types';

/**
 * Web Crawl Metrics Data Port Interface
 *
 * Defines the contract for metrics data operations in the infrastructure layer.
 * This interface is implemented by infrastructure adapters to provide
 * metrics data access capabilities.
 *
 * The port follows the Clean Architecture pattern and abstracts the
 * data access layer from the application services.
 *
 * NOTE: This port has been moved from application layer to infrastructure layer
 * because it's implemented by infrastructure adapters and used by application services.
 */
export interface IWebCrawlMetricsDataPort {
  /**
   * Retrieves comprehensive web crawl metrics for a specified time range
   *
   * @param hours - Number of hours to look back for metrics calculation
   * @returns Promise resolving to WebCrawlMetrics object with aggregated data
   *
   * @example
   * ```typescript
   * const metrics = await metricsDataPort.getWebCrawlMetrics(24);
   * console.log(`New tasks: ${metrics.newTasksCount}`);
   * ```
   */
  getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics>;

  /**
   * Retrieves the count of new tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of new tasks
   *
   * @example
   * ```typescript
   * const newTasksCount = await metricsDataPort.getNewTasksCount(6);
   * console.log(`New tasks in last 6 hours: ${newTasksCount}`);
   * ```
   */
  getNewTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of completed tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of completed tasks
   *
   * @example
   * ```typescript
   * const completedTasksCount = await metricsDataPort.getCompletedTasksCount(24);
   * console.log(`Completed tasks in last 24 hours: ${completedTasksCount}`);
   * ```
   */
  getCompletedTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of error tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of error tasks
   *
   * @example
   * ```typescript
   * const errorTasksCount = await metricsDataPort.getErrorTasksCount(12);
   * console.log(`Error tasks in last 12 hours: ${errorTasksCount}`);
   * ```
   */
  getErrorTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of all tasks created within a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of all tasks created in the time range
   *
   * @example
   * ```typescript
   * const totalTasksCount = await metricsDataPort.getTotalTasksCountByCreationTime(24);
   * console.log(`Total tasks created in last 24 hours: ${totalTasksCount}`);
   * ```
   */
  getTotalTasksCountByCreationTime(hours: number): Promise<number>;
}
````

### 3. Update Logger Implementation to Use Enum

**File**: `src/common/utils/logger.ts`

```typescript
import { LoggerFactory } from './logging';
import { loggerConfig } from '../../config/logger';
import { LoggerLevel } from '../enums/logger-level.enum';

/**
 * Global logger instance for the task-manager application
 *
 * This logger is initialized asynchronously by the application startup.
 * Before initialization, it will fall back to a basic console logger.
 *
 * Usage:
 *   import { logger } from './common/utils/logger';
 *   logger.info('Message', { metadata: 'value' });
 */

// Create a basic fallback logger for use before initialization
class FallbackLogger {
  info(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[level:${LoggerLevel.INFO},service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) console.log(JSON.stringify(metadata, null, 2));
  }

  warn(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[level:${LoggerLevel.WARN},service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) console.warn(JSON.stringify(metadata, null, 2));
  }

  error(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[level:${LoggerLevel.ERROR},service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) console.error(JSON.stringify(metadata, null, 2));
  }

  debug(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.debug(`[level:${LoggerLevel.DEBUG},service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) console.debug(JSON.stringify(metadata, null, 2));
  }

  success(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[level:${LoggerLevel.SUCCESS},service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) console.log(JSON.stringify(metadata, null, 2));
  }
}

// Start with fallback logger
let currentLogger: any = new FallbackLogger();

/**
 * Initialize the logger system
 * This should be called during application startup, after OTEL initialization
 */
export async function initializeLogger(): Promise<void> {
  try {
    const factory = LoggerFactory.getInstance();
    const config = {
      serviceName: loggerConfig.serviceName,
      logLevel: loggerConfig.logLevel,
      enableConsole: loggerConfig.enableConsole,
      enableOTEL: loggerConfig.enableOTEL,
      otelEndpoint: loggerConfig.otelEndpoint,
      environment: loggerConfig.environment,
      circuitBreaker: loggerConfig.circuitBreaker,
    };

    await factory.initialize(config);
    currentLogger = factory.getLogger();

    // Log successful initialization with minimal details [[memory:5744101]]
    currentLogger.info('Logger initialized', {
      service: config.serviceName,
      otelEnabled: config.enableOTEL,
    });
  } catch (error) {
    console.error('Failed to initialize logger, using fallback:', error);
    // Keep using fallback logger
  }
}

/**
 * Global logger proxy that delegates to the current logger implementation
 */
export const logger = {
  info: (message: string, metadata?: any) => currentLogger.info(message, metadata),
  warn: (message: string, metadata?: any) => currentLogger.warn(message, metadata),
  error: (message: string, metadata?: any) => currentLogger.error(message, metadata),
  debug: (message: string, metadata?: any) => currentLogger.debug(message, metadata),
  success: (message: string, metadata?: any) => currentLogger.success(message, metadata),
};

// Export logger level enum for use in other modules
export { LoggerLevel };
```

### 4. Update Logger Factory to Use Enum

**File**: `src/common/utils/logging/logger-factory.ts`

```typescript
import { LoggerLevel } from '../../enums/logger-level.enum';
// ... existing imports ...

export interface LoggerConfig {
  serviceName: string;
  logLevel: LoggerLevel; // Updated to use enum
  enableConsole: boolean;
  enableOTEL: boolean;
  otelEndpoint?: string;
  environment: string;
  circuitBreaker: CircuitBreakerConfig;
}

// ... rest of the implementation with LoggerLevel enum usage ...
```

### 5. Update OTEL Logger to Use Enum

**File**: `src/common/utils/logging/otel-logger.ts`

```typescript
import { LoggerLevel } from '../../enums/logger-level.enum';
// ... existing imports ...

export class OTELLogger implements Logger {
  // ... existing implementation with LoggerLevel enum usage ...

  info(message: string, metadata?: any): void {
    this.log(LoggerLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log(LoggerLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log(LoggerLevel.ERROR, message, metadata);
  }

  debug(message: string, metadata?: any): void {
    this.log(LoggerLevel.DEBUG, message, metadata);
  }

  success(message: string, metadata?: any): void {
    this.log(LoggerLevel.SUCCESS, message, metadata);
  }

  private log(level: LoggerLevel, message: string, metadata?: any): void {
    // ... implementation using enum ...
  }
}
```

### 6. Update Application Service Import

**File**: `src/application/metrics/services/WebCrawlMetricsService.ts`

```typescript
import { IWebCrawlMetricsDataPort } from '../../../infrastructure/ports/web-crawl-metrics-data.port';
// ... rest of the file remains the same ...
```

### 7. Update Application Factory Import

**File**: `src/application/services/application.factory.ts`

```typescript
import { IWebCrawlMetricsDataPort } from '../../infrastructure/ports/web-crawl-metrics-data.port';
// ... rest of the file remains the same ...
```

### 8. Update Postgres Factory Import

**File**: `src/infrastructure/persistence/postgres/postgres.factory.ts`

```typescript
import { IWebCrawlMetricsDataPort } from '../../ports/web-crawl-metrics-data.port';
// ... rest of the file remains the same ...
```

### 9. Update WebCrawlMetricsAdapter Import

**File**: `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts`

```typescript
import { IWebCrawlMetricsDataPort } from '../../../ports/web-crawl-metrics-data.port';
// ... rest of the file remains the same ...
```

### 10. Create Kafka Topic Types

**File**: `src/common/types/index.ts`

Add topic-related types:

```typescript
// ... existing types ...

export interface KafkaTopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs?: number;
  cleanupPolicy?: string;
}

export interface KafkaTopicsConfig {
  webCrawlRequest: KafkaTopicConfig;
  taskStatus: KafkaTopicConfig;
  // Add other topics as needed
}

export interface TopicValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 11. Create Kafka Topic Configuration

**File**: `src/config/kafka-topics.ts`

```typescript
import { KafkaTopicsConfig, KafkaTopicConfig, TopicValidationResult } from '../common/types';

/**
 * Default Kafka topic configurations
 *
 * NOTE: taskStatus topic configuration moved from kafka.ts config
 */
const DEFAULT_TOPIC_CONFIGS: KafkaTopicsConfig = {
  webCrawlRequest: {
    name: 'requests-web-crawl',
    partitions: 3,
    replicationFactor: 1,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupPolicy: 'delete',
  },
  taskStatus: {
    name: 'task-status',
    partitions: 3,
    replicationFactor: 1,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanupPolicy: 'delete',
  },
};

/**
 * Environment variable mappings for topic names
 */
const TOPIC_ENV_VARS = {
  webCrawlRequest: 'WEB_CRAWL_REQUEST_TOPIC',
  taskStatus: 'TASK_STATUS_TOPIC',
} as const;

/**
 * Kafka topic configuration manager
 */
export class KafkaTopicConfig {
  private static instance: KafkaTopicConfig;
  private config: KafkaTopicsConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): KafkaTopicConfig {
    if (!KafkaTopicConfig.instance) {
      KafkaTopicConfig.instance = new KafkaTopicConfig();
    }
    return KafkaTopicConfig.instance;
  }

  /**
   * Load configuration from environment variables and defaults
   */
  private loadConfiguration(): KafkaTopicsConfig {
    const config = { ...DEFAULT_TOPIC_CONFIGS };

    // Override with environment variables
    Object.entries(TOPIC_ENV_VARS).forEach(([key, envVar]) => {
      const envValue = process.env[envVar];
      if (envValue) {
        config[key as keyof KafkaTopicsConfig].name = envValue;
      }
    });

    return config;
  }

  /**
   * Get topic configuration by name
   */
  public getTopicConfig(topicKey: keyof KafkaTopicsConfig): KafkaTopicConfig {
    return this.config[topicKey];
  }

  /**
   * Get topic name by key
   */
  public getTopicName(topicKey: keyof KafkaTopicsConfig): string {
    return this.config[topicKey].name;
  }

  /**
   * Get all topic configurations
   */
  public getAllTopicConfigs(): KafkaTopicsConfig {
    return { ...this.config };
  }

  /**
   * Validate topic configuration
   */
  public validateConfiguration(): TopicValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    Object.entries(this.config).forEach(([key, config]) => {
      // Validate topic name
      if (!config.name || config.name.trim() === '') {
        errors.push(`Topic name for ${key} is empty`);
      }

      if (!this.isValidTopicName(config.name)) {
        errors.push(`Invalid topic name for ${key}: ${config.name}`);
      }

      // Validate partitions
      if (config.partitions < 1) {
        errors.push(`Invalid partitions for ${key}: ${config.partitions}`);
      }

      // Validate replication factor
      if (config.replicationFactor < 1) {
        errors.push(`Invalid replication factor for ${key}: ${config.replicationFactor}`);
      }

      // Check for potential issues
      if (config.partitions > 10) {
        warnings.push(`High partition count for ${key}: ${config.partitions}`);
      }

      if (config.replicationFactor > 3) {
        warnings.push(`High replication factor for ${key}: ${config.replicationFactor}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate topic name format
   */
  private isValidTopicName(topicName: string): boolean {
    // Kafka topic name validation rules:
    // - Must not be empty
    // - Must not contain special characters except: . _ -
    // - Must not start with a number
    // - Must not be longer than 249 characters
    const topicNameRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

    return topicName.length > 0 && topicName.length <= 249 && topicNameRegex.test(topicName);
  }

  /**
   * Get environment variable for topic
   */
  public getTopicEnvVar(topicKey: keyof KafkaTopicsConfig): string {
    return TOPIC_ENV_VARS[topicKey];
  }

  /**
   * Reload configuration (useful for testing)
   */
  public reloadConfiguration(): void {
    this.config = this.loadConfiguration();
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigurationSummary(): Record<string, string> {
    const summary: Record<string, string> = {};

    Object.entries(this.config).forEach(([key, config]) => {
      summary[key] = config.name;
    });

    return summary;
  }
}

/**
 * Convenience functions for easy access
 */
export const getKafkaTopicConfig = (topicKey: keyof KafkaTopicsConfig): KafkaTopicConfig => {
  return KafkaTopicConfig.getInstance().getTopicConfig(topicKey);
};

export const getKafkaTopicName = (topicKey: keyof KafkaTopicsConfig): string => {
  return KafkaTopicConfig.getInstance().getTopicName(topicKey);
};

export const validateKafkaTopics = (): TopicValidationResult => {
  return KafkaTopicConfig.getInstance().validateConfiguration();
};

export const getKafkaTopicsSummary = (): Record<string, string> => {
  return KafkaTopicConfig.getInstance().getConfigurationSummary();
};
```

### 12. Update Configuration Index

**File**: `src/config/index.ts`

```typescript
// ... existing exports ...

// Kafka Topic Configuration
export { KafkaTopicConfig, getKafkaTopicConfig, getKafkaTopicName, validateKafkaTopics, getKafkaTopicsSummary } from './kafka-topics';

// Logger Level Enum
export { LoggerLevel } from '../common/enums/logger-level.enum';

export type { KafkaTopicsConfig, KafkaTopicConfig as KafkaTopicConfigType, TopicValidationResult } from '../common/types';
```

### 13. Create Unit Tests

**File**: `src/config/__tests__/kafka-topics.spec.ts`

```typescript
import { KafkaTopicConfig, validateKafkaTopics, getKafkaTopicName } from '../kafka-topics';

describe('Kafka Topic Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Reset singleton instance for each test
    (KafkaTopicConfig as any).instance = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should load default topic configurations', () => {
      const config = KafkaTopicConfig.getInstance();
      const topicConfigs = config.getAllTopicConfigs();

      expect(topicConfigs.webCrawlRequest.name).toBe('requests-web-crawl');
      expect(topicConfigs.taskStatus.name).toBe('task-status');
    });

    it('should have valid default configurations', () => {
      const validation = validateKafkaTopics();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Environment Variable Override', () => {
    it('should override topic name with environment variable', () => {
      process.env.WEB_CRAWL_REQUEST_TOPIC = 'custom-web-crawl-topic';

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      expect(config.getTopicName('webCrawlRequest')).toBe('custom-web-crawl-topic');
    });

    it('should handle multiple environment variable overrides', () => {
      process.env.WEB_CRAWL_REQUEST_TOPIC = 'custom-web-crawl';
      process.env.TASK_STATUS_TOPIC = 'custom-task-status';

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      expect(config.getTopicName('webCrawlRequest')).toBe('custom-web-crawl');
      expect(config.getTopicName('taskStatus')).toBe('custom-task-status');
    });
  });

  describe('Topic Name Validation', () => {
    it('should validate correct topic names', () => {
      const validNames = ['valid-topic', 'valid_topic', 'valid.topic', 'ValidTopic', 'topic123'];

      validNames.forEach((name) => {
        const config = KafkaTopicConfig.getInstance();
        const topicConfig = config.getTopicConfig('webCrawlRequest');
        topicConfig.name = name;

        const validation = config.validateConfiguration();
        expect(validation.isValid).toBe(true);
      });
    });

    it('should reject invalid topic names', () => {
      const invalidNames = [
        '',
        '123topic',
        'topic-with-special@chars',
        'topic-with-spaces',
        'a'.repeat(250), // Too long
      ];

      invalidNames.forEach((name) => {
        const config = KafkaTopicConfig.getInstance();
        const topicConfig = config.getTopicConfig('webCrawlRequest');
        topicConfig.name = name;

        const validation = config.validateConfiguration();
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should detect invalid partition count', () => {
      const config = KafkaTopicConfig.getInstance();
      const topicConfig = config.getTopicConfig('webCrawlRequest');
      topicConfig.partitions = 0;

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid partitions for webCrawlRequest: 0');
    });

    it('should detect invalid replication factor', () => {
      const config = KafkaTopicConfig.getInstance();
      const topicConfig = config.getTopicConfig('webCrawlRequest');
      topicConfig.replicationFactor = 0;

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid replication factor for webCrawlRequest: 0');
    });

    it('should provide warnings for high values', () => {
      const config = KafkaTopicConfig.getInstance();
      const topicConfig = config.getTopicConfig('webCrawlRequest');
      topicConfig.partitions = 15;
      topicConfig.replicationFactor = 5;

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('High partition count for webCrawlRequest: 15');
      expect(validation.warnings).toContain('High replication factor for webCrawlRequest: 5');
    });
  });

  describe('Convenience Functions', () => {
    it('should provide easy access to topic names', () => {
      expect(getKafkaTopicName('webCrawlRequest')).toBe('requests-web-crawl');
      expect(getKafkaTopicName('taskStatus')).toBe('task-status');
    });

    it('should provide configuration summary', () => {
      const config = KafkaTopicConfig.getInstance();
      const summary = config.getConfigurationSummary();

      expect(summary.webCrawlRequest).toBe('requests-web-crawl');
      expect(summary.taskStatus).toBe('task-status');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KafkaTopicConfig.getInstance();
      const instance2 = KafkaTopicConfig.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reload configuration correctly', () => {
      const config = KafkaTopicConfig.getInstance();
      const originalName = config.getTopicName('webCrawlRequest');

      process.env.WEB_CRAWL_REQUEST_TOPIC = 'reload-test-topic';
      config.reloadConfiguration();

      expect(config.getTopicName('webCrawlRequest')).toBe('reload-test-topic');

      // Clean up
      delete process.env.WEB_CRAWL_REQUEST_TOPIC;
      config.reloadConfiguration();
      expect(config.getTopicName('webCrawlRequest')).toBe(originalName);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed environment variables gracefully', () => {
      process.env.WEB_CRAWL_REQUEST_TOPIC = '';

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Topic name cannot be empty');
    });

    it('should handle undefined environment variables', () => {
      delete process.env.WEB_CRAWL_REQUEST_TOPIC;

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      // Should fall back to default
      expect(config.getTopicName('webCrawlRequest')).toBe('requests-web-crawl');
    });

    it('should handle special characters in topic names', () => {
      const invalidNames = ['topic@with@at', 'topic#with#hash', 'topic$with$dollar', 'topic%with%percent', 'topic^with^caret', 'topic&with&ampersand', 'topic*with*asterisk', 'topic(with)parentheses', 'topic[with]brackets', 'topic{with}braces', 'topic|with|pipe', 'topic\\with\\backslash', 'topic/with/forward-slash', 'topic:with:colon', 'topic;with;semicolon', 'topic"with"quotes', "topic'with'apostrophe", 'topic<with>angles', 'topic,with,comma', 'topic?with?question', 'topic!with!exclamation'];

      invalidNames.forEach((name) => {
        process.env.WEB_CRAWL_REQUEST_TOPIC = name;
        const config = KafkaTopicConfig.getInstance();
        config.reloadConfiguration();

        const validation = config.validateConfiguration();
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some((error) => error.includes('Invalid topic name'))).toBe(true);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long topic names', () => {
      const longName = 'a'.repeat(249); // Maximum allowed length
      process.env.WEB_CRAWL_REQUEST_TOPIC = longName;

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(true);
    });

    it('should reject topic names that are too long', () => {
      const tooLongName = 'a'.repeat(250); // Exceeds maximum length
      process.env.WEB_CRAWL_REQUEST_TOPIC = tooLongName;

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      const validation = config.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((error) => error.includes('Topic name too long'))).toBe(true);
    });

    it('should handle concurrent configuration access', () => {
      const promises = Array.from({ length: 10 }, () => Promise.resolve(KafkaTopicConfig.getInstance()));

      return Promise.all(promises).then((instances) => {
        const firstInstance = instances[0];
        instances.forEach((instance) => {
          expect(instance).toBe(firstInstance);
        });
      });
    });

    it('should handle rapid configuration reloads', () => {
      const config = KafkaTopicConfig.getInstance();

      for (let i = 0; i < 100; i++) {
        process.env.WEB_CRAWL_REQUEST_TOPIC = `rapid-reload-${i}`;
        config.reloadConfiguration();
        expect(config.getTopicName('webCrawlRequest')).toBe(`rapid-reload-${i}`);
      }
    });
  });

  describe('Configuration Persistence', () => {
    it('should maintain configuration across reloads', () => {
      const config = KafkaTopicConfig.getInstance();
      const originalConfigs = config.getAllTopicConfigs();

      // Modify a topic config
      const topicConfig = config.getTopicConfig('webCrawlRequest');
      topicConfig.partitions = 10;
      topicConfig.replicationFactor = 3;

      // Reload configuration
      config.reloadConfiguration();

      // Verify the modified config is preserved
      const reloadedConfig = config.getTopicConfig('webCrawlRequest');
      expect(reloadedConfig.partitions).toBe(10);
      expect(reloadedConfig.replicationFactor).toBe(3);
    });

    it('should handle configuration reset', () => {
      const config = KafkaTopicConfig.getInstance();

      // Set custom environment variable
      process.env.WEB_CRAWL_REQUEST_TOPIC = 'custom-topic';
      config.reloadConfiguration();
      expect(config.getTopicName('webCrawlRequest')).toBe('custom-topic');

      // Reset environment
      delete process.env.WEB_CRAWL_REQUEST_TOPIC;
      config.reloadConfiguration();
      expect(config.getTopicName('webCrawlRequest')).toBe('requests-web-crawl');
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe topic key access', () => {
      const config = KafkaTopicConfig.getInstance();

      // These should compile without errors
      const webCrawlTopic = config.getTopicName('webCrawlRequest');
      const taskStatusTopic = config.getTopicName('taskStatus');

      expect(typeof webCrawlTopic).toBe('string');
      expect(typeof taskStatusTopic).toBe('string');
    });

    it('should reject invalid topic keys at compile time', () => {
      const config = KafkaTopicConfig.getInstance();

      // This should cause a TypeScript compilation error
      // const invalidTopic = config.getTopicName('invalidKey');

      // For runtime testing, we can test the error handling
      expect(() => {
        (config as any).getTopicName('invalidKey');
      }).toThrow();
    });
  });

  describe('Integration with Kafka Config', () => {
    it('should work with existing Kafka configuration', () => {
      const topicName = getKafkaTopicName('webCrawlRequest');
      expect(topicName).toBe('requests-web-crawl');

      // Verify it can be used with Kafka client configuration
      const kafkaConfig = {
        topic: topicName,
        // ... other config
      };

      expect(kafkaConfig.topic).toBe('requests-web-crawl');
    });

    it('should maintain backward compatibility with existing topic references', () => {
      // Test that the old TASK_STATUS_TOPIC is now handled by the new system
      process.env.TASK_STATUS_TOPIC = 'legacy-task-status';

      const config = KafkaTopicConfig.getInstance();
      config.reloadConfiguration();

      expect(config.getTopicName('taskStatus')).toBe('legacy-task-status');
    });
  });
});
```

### 14. Create Logger Level Enum Tests

**File**: `src/common/enums/__tests__/logger-level.enum.spec.ts`

```typescript
import { LoggerLevel } from '../logger-level.enum';

describe('LoggerLevel Enum', () => {
  it('should have all required log levels', () => {
    expect(LoggerLevel.INFO).toBe('info');
    expect(LoggerLevel.WARN).toBe('warn');
    expect(LoggerLevel.ERROR).toBe('error');
    expect(LoggerLevel.DEBUG).toBe('debug');
    expect(LoggerLevel.SUCCESS).toBe('success');
  });

  it('should have correct number of levels', () => {
    const levels = Object.values(LoggerLevel);
    expect(levels).toHaveLength(5);
  });

  it('should have unique values', () => {
    const levels = Object.values(LoggerLevel);
    const uniqueLevels = new Set(levels);
    expect(uniqueLevels.size).toBe(levels.length);
  });

  it('should maintain backward compatibility with LoggerLevelType', () => {
    const levels: LoggerLevelType[] = [LoggerLevel.INFO, LoggerLevel.WARN, LoggerLevel.ERROR, LoggerLevel.DEBUG, LoggerLevel.SUCCESS];

    expect(levels).toHaveLength(5);
    expect(levels.every((level) => typeof level === 'string')).toBe(true);
  });

  it('should work with string comparison', () => {
    expect(LoggerLevel.INFO === 'info').toBe(true);
    expect(LoggerLevel.WARN === 'warn').toBe(true);
    expect(LoggerLevel.ERROR === 'error').toBe(true);
    expect(LoggerLevel.DEBUG === 'debug').toBe(true);
    expect(LoggerLevel.SUCCESS === 'success').toBe(true);
  });

  it('should work with switch statements', () => {
    const testSwitch = (level: LoggerLevel): string => {
      switch (level) {
        case LoggerLevel.INFO:
          return 'information';
        case LoggerLevel.WARN:
          return 'warning';
        case LoggerLevel.ERROR:
          return 'error';
        case LoggerLevel.DEBUG:
          return 'debug';
        case LoggerLevel.SUCCESS:
          return 'success';
        default:
          return 'unknown';
      }
    };

    expect(testSwitch(LoggerLevel.INFO)).toBe('information');
    expect(testSwitch(LoggerLevel.WARN)).toBe('warning');
    expect(testSwitch(LoggerLevel.ERROR)).toBe('error');
    expect(testSwitch(LoggerLevel.DEBUG)).toBe('debug');
    expect(testSwitch(LoggerLevel.SUCCESS)).toBe('success');
  });

  it('should work with array methods', () => {
    const levels = Object.values(LoggerLevel);

    expect(levels.includes(LoggerLevel.INFO)).toBe(true);
    expect(levels.includes(LoggerLevel.WARN)).toBe(true);
    expect(levels.includes(LoggerLevel.ERROR)).toBe(true);
    expect(levels.includes(LoggerLevel.DEBUG)).toBe(true);
    expect(levels.includes(LoggerLevel.SUCCESS)).toBe(true);
  });

  it('should work with object keys', () => {
    const levelKeys = Object.keys(LoggerLevel);
    expect(levelKeys).toContain('INFO');
    expect(levelKeys).toContain('WARN');
    expect(levelKeys).toContain('ERROR');
    expect(levelKeys).toContain('DEBUG');
    expect(levelKeys).toContain('SUCCESS');
  });

  it('should maintain immutability', () => {
    const originalInfo = LoggerLevel.INFO;

    // Attempt to modify (this should not work in a real enum)
    expect(() => {
      (LoggerLevel as any).INFO = 'modified';
    }).toThrow();

    expect(LoggerLevel.INFO).toBe(originalInfo);
  });
});
```

### 15. Update All Test Files

Update all test files that import the moved port:

**Files to update**:

- `src/application/services/__tests__/application.factory.spec.ts`
- `src/application/metrics/services/__tests__/WebCrawlMetricsService.spec.ts`

**Example update**:

```typescript
// Before
import { IWebCrawlMetricsDataPort } from '../../metrics/ports/IWebCrawlMetricsDataPort';

// After
import { IWebCrawlMetricsDataPort } from '../../../infrastructure/ports/web-crawl-metrics-data.port';
```

### 16. Update Kafka Configuration to Use New Topic System

**File**: `src/config/kafka.ts`

````typescript
import { z } from 'zod';
import { getKafkaTopicName } from './kafka-topics';

/**
 * Kafka Configuration Schema
 *
 * Validates environment variables for Kafka connection with comprehensive
 * configuration options for both development and production environments.
 *
 * This schema defines all Kafka connection parameters with appropriate
 * defaults and validation rules. It supports both basic and advanced
 * Kafka configurations including SSL, SASL authentication, and custom
 * timeouts.
 *
 * The schema includes configuration for:
 * - Connection parameters (brokers, client ID, group ID)
 * - Security settings (SSL, SASL authentication)
 * - Connection timeouts and intervals
 * - Retry configuration
 *
 * NOTE: Topic configuration has been moved to kafka-topics.ts
 */
const kafkaConfigSchema = z.object({
  // Required environment variables with docker-compose defaults
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('task-manager'),
  KAFKA_GROUP_ID: z.string().default('task-manager-group'),

  // Optional environment variables with defaults
  KAFKA_SSL_ENABLED: z.coerce.boolean().default(false),
  KAFKA_SASL_ENABLED: z.coerce.boolean().default(false),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).default('plain'),
  KAFKA_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(3000),
  KAFKA_REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),
  KAFKA_SESSION_TIMEOUT: z.coerce.number().int().positive().default(30000),
  KAFKA_HEARTBEAT_INTERVAL: z.coerce.number().int().positive().default(3000),
  KAFKA_RETRY_BACKOFF: z.coerce.number().int().positive().default(100),
  KAFKA_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
});

/**
 * Parse and validate environment variables
 *
 * This function parses the current process environment variables
 * against the defined schema, providing runtime validation and
 * default values for missing configuration.
 *
 * @throws Error - When environment variables fail validation
 */
const config = kafkaConfigSchema.parse(process.env);

/**
 * Kafka Configuration Object
 *
 * Contains all Kafka connection parameters with parsed broker list
 * and comprehensive client configuration options.
 *
 * This object provides a structured way to access Kafka configuration
 * values with pre-configured objects for kafkajs client and consumer
 * configurations. It includes computed values like parsed broker lists
 * and conditional SASL configuration.
 *
 * The configuration is organized into logical groups:
 * - Connection parameters (brokers, client ID, group ID)
 * - Security settings (SSL, SASL)
 * - Connection timeouts and intervals
 * - Retry configuration
 * - Pre-configured client and consumer objects
 *
 * NOTE: Topic configuration is now handled by kafka-topics.ts
 */
export const kafkaConfig = {
  // Connection parameters
  brokers: config.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  clientId: config.KAFKA_CLIENT_ID,
  groupId: config.KAFKA_GROUP_ID,

  // SSL configuration
  ssl: config.KAFKA_SSL_ENABLED,

  // SASL configuration
  sasl: config.KAFKA_SASL_ENABLED
    ? {
        mechanism: config.KAFKA_SASL_MECHANISM,
        username: config.KAFKA_SASL_USERNAME,
        password: config.KAFKA_SASL_PASSWORD,
      }
    : false,

  // Connection timeouts
  connectionTimeout: config.KAFKA_CONNECTION_TIMEOUT,
  requestTimeout: config.KAFKA_REQUEST_TIMEOUT,
  sessionTimeout: config.KAFKA_SESSION_TIMEOUT,
  heartbeatInterval: config.KAFKA_HEARTBEAT_INTERVAL,

  // Retry configuration
  retryBackoff: config.KAFKA_RETRY_BACKOFF,
  maxRetryAttempts: config.KAFKA_MAX_RETRY_ATTEMPTS,

  // Client configuration object for kafkajs
  clientConfig: {
    clientId: config.KAFKA_CLIENT_ID,
    brokers: config.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
    ssl: config.KAFKA_SSL_ENABLED,
    sasl: config.KAFKA_SASL_ENABLED
      ? {
          mechanism: config.KAFKA_SASL_MECHANISM,
          username: config.KAFKA_SASL_USERNAME,
          password: config.KAFKA_SASL_PASSWORD,
        }
      : undefined,
    connectionTimeout: config.KAFKA_CONNECTION_TIMEOUT,
    requestTimeout: config.KAFKA_REQUEST_TIMEOUT,
    retry: {
      initialRetryTime: config.KAFKA_RETRY_BACKOFF,
      retries: config.KAFKA_MAX_RETRY_ATTEMPTS,
    },
  },

  // Consumer configuration object for kafkajs
  consumerConfig: {
    groupId: config.KAFKA_GROUP_ID,
    sessionTimeout: config.KAFKA_SESSION_TIMEOUT,
    heartbeatInterval: config.KAFKA_HEARTBEAT_INTERVAL,
    retry: {
      initialRetryTime: config.KAFKA_RETRY_BACKOFF,
      retries: config.KAFKA_MAX_RETRY_ATTEMPTS,
    },
  },
};

/**
 * Type definition for Kafka configuration
 *
 * This type provides TypeScript type safety for the Kafka
 * configuration object, enabling autocomplete and compile-time
 * type checking throughout the application.
 *
 * @example
 * ```typescript
 * function configureKafka(config: KafkaConfigType) {
 *   console.log(`Connecting to brokers: ${config.brokers.join(', ')}`);
 * }
 * ```
 */
export type KafkaConfigType = typeof kafkaConfig;
````

### 17. Update All Files Using kafkaConfig.topics.taskStatus

**Files to update**:

- `src/api/kafka/kafka.router.ts`
- `scripts/test-kafka-connection.ts`
- `scripts/push-kafka-tasks.ts`
- `scripts/push-kafka-tasks-simple.ts`

**Example update**:

```typescript
// Before
import { kafkaConfig } from '../../config/kafka';
const taskStatusTopic = kafkaConfig.topics.taskStatus;

// After
import { getKafkaTopicName } from '../../config/kafka-topics';
const taskStatusTopic = getKafkaTopicName('taskStatus');
```

### 18. Create Environment Variable Documentation

````markdown
# Kafka Topic Configuration

## Environment Variables

The following environment variables can be used to configure Kafka topic names:

### WEB_CRAWL_REQUEST_TOPIC

- **Default**: `requests-web-crawl`
- **Description**: Topic name for web crawl request messages
- **Example**: `WEB_CRAWL_REQUEST_TOPIC=my-web-crawl-requests`

### TASK_STATUS_TOPIC

- **Default**: `task-status`
- **Description**: Topic name for task status messages
- **Example**: `TASK_STATUS_TOPIC=my-task-status`

## Usage

```typescript
import { getKafkaTopicName, validateKafkaTopics } from '../config';

// Get topic name
const topicName = getKafkaTopicName('webCrawlRequest');

// Validate configuration
const validation = validateKafkaTopics();
if (!validation.isValid) {
  console.error('Invalid Kafka topic configuration:', validation.errors);
}
```

## Logger Level Enum

The logger now uses an enum for log levels instead of string union types:

```typescript
import { LoggerLevel } from '../common/enums/logger-level.enum';

// Usage
logger.info('Message', { level: LoggerLevel.INFO });
```

## Port Architecture Changes

The `IWebCrawlMetricsDataPort` has been moved from the application layer to the infrastructure layer:

- **Old location**: `src/application/metrics/ports/IWebCrawlMetricsDataPort.ts`
- **New location**: `src/infrastructure/ports/web-crawl-metrics-data.port.ts`

This change reflects the correct architectural pattern where infrastructure ports define contracts for external systems.
````

## Topic Naming Rules

- Must not be empty
- Must not contain special characters except: `.` `_` `-`
- Must not start with a number
- Must not be longer than 249 characters
- Should follow kebab-case convention

## Potential Issues and Mitigations

### 1. Environment Variable Conflicts

**Issue**: Environment variables might conflict with other configurations
**Mitigation**: Use specific prefixes and clear documentation

### 2. Invalid Topic Names

**Issue**: Invalid topic names might cause Kafka connection issues
**Mitigation**: Comprehensive validation with clear error messages

### 3. Configuration Reload Issues

**Issue**: Configuration changes might not be reflected immediately
**Mitigation**: Provide reload method and clear documentation

### 4. Singleton Pattern Issues

**Issue**: Singleton might cause issues in testing
**Mitigation**: Provide reload method for testing scenarios

### 5. Type Safety

**Issue**: Topic keys might be mistyped
**Mitigation**: Use TypeScript keyof types and strict validation

### 6. Logger Level Enum Migration

**Issue**: Breaking change for existing logger usage
**Mitigation**: Provide backward compatibility type alias

### 7. Port Movement

**Issue**: Import path changes across multiple files
**Mitigation**: Comprehensive search and replace with proper testing

## Success Criteria

- [ ] Default topic configurations are loaded correctly
- [ ] Environment variable overrides work properly
- [ ] Topic name validation is comprehensive
- [ ] Configuration validation provides clear feedback
- [ ] Singleton pattern works correctly
- [ ] Logger level enum is implemented and used consistently
- [ ] IWebCrawlMetricsDataPort is moved to infrastructure layer
- [ ] All import paths are updated correctly
- [ ] Existing TASK_STATUS_TOPIC is moved to new topic configuration system
- [ ] All files using kafkaConfig.topics.taskStatus are updated
- [ ] All unit tests pass
- [ ] Type safety is maintained
- [ ] Documentation is clear and complete

## Dependencies

- TypeScript configuration
- Existing config structure
- Environment variable support
- Logger system refactoring

## Estimated Effort

- **Development**: 1 day
- **Testing**: 0.5 day
- **Documentation**: 0.25 day
- **Total**: 1.75 days

## Notes

- This job provides the foundation for Kafka topic configuration
- Includes architectural improvements based on feedback
- Logger level enum improves type safety
- Port movement aligns with clean architecture principles
- Existing TASK_STATUS_TOPIC configuration is consolidated into the new topic system
- Must be completed before Kafka publisher implementation
- Environment variable names should be documented clearly
- Validation should be comprehensive to prevent runtime issues

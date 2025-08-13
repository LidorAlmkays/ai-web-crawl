/**
 * Standardized trace attributes for consistent naming across the application
 *
 * This class provides constants and utilities for trace attributes to ensure
 * consistent naming conventions and proper data handling across the application.
 *
 * Features:
 * - Standardized attribute keys
 * - Sensitive data filtering
 * - Attribute creation utilities
 * - Consistent naming conventions
 */
export class TraceAttributes {
  // Service attributes
  static readonly SERVICE_NAME = 'service.name';
  static readonly SERVICE_VERSION = 'service.version';
  static readonly SERVICE_ENVIRONMENT = 'service.environment';
  static readonly SERVICE_TYPE = 'service.type';
  static readonly SERVICE_TEAM = 'service.team';

  // Kafka attributes
  static readonly KAFKA_TOPIC = 'kafka.topic';
  static readonly KAFKA_PARTITION = 'kafka.partition';
  static readonly KAFKA_OFFSET = 'kafka.offset';
  static readonly KAFKA_CONSUMER_GROUP = 'kafka.consumer_group';
  static readonly MESSAGE_SIZE = 'message.size';
  static readonly MESSAGE_KEY = 'message.key';
  static readonly MESSAGE_TIMESTAMP = 'message.timestamp';

  // Database attributes
  static readonly DATABASE_OPERATION = 'database.operation';
  static readonly DATABASE_TABLE = 'database.table';
  static readonly DATABASE_QUERY = 'database.query';
  static readonly DATABASE_CONNECTION_POOL = 'database.connection_pool';
  static readonly DATABASE_QUERY_DURATION = 'database.query_duration';

  // Task attributes
  static readonly TASK_ID = 'task.id';
  static readonly TASK_STATUS = 'task.status';
  static readonly TASK_PRIORITY = 'task.priority';
  static readonly TASK_URL = 'task.url';
  static readonly TASK_CREATED_AT = 'task.created_at';
  static readonly TASK_UPDATED_AT = 'task.updated_at';
  static readonly TASK_PROCESSING_TIME = 'task.processing_time';

  // HTTP attributes
  static readonly HTTP_METHOD = 'http.method';
  static readonly HTTP_URL = 'http.url';
  static readonly HTTP_STATUS_CODE = 'http.status_code';
  static readonly HTTP_REQUEST_SIZE = 'http.request_size';
  static readonly HTTP_RESPONSE_SIZE = 'http.response_size';
  static readonly HTTP_USER_AGENT = 'http.user_agent';

  // Trace attributes
  static readonly PARENT_TRACE_ID = 'parent.trace.id';
  static readonly DISTRIBUTED_TRACE = 'distributed.trace';
  static readonly TRACE_SAMPLING_RATE = 'trace.sampling_rate';
  static readonly TRACE_EXPORT_STATUS = 'trace.export_status';

  // Performance attributes
  static readonly OPERATION_DURATION = 'operation.duration';
  static readonly MEMORY_USAGE = 'memory.usage';
  static readonly CPU_USAGE = 'cpu.usage';
  static readonly QUEUE_SIZE = 'queue.size';

  // Error attributes
  static readonly ERROR_TYPE = 'error.type';
  static readonly ERROR_MESSAGE = 'error.message';
  static readonly ERROR_STACK_TRACE = 'error.stack_trace';
  static readonly ERROR_CODE = 'error.code';

  // Business attributes
  static readonly BUSINESS_OPERATION = 'business.operation';
  static readonly BUSINESS_ENTITY = 'business.entity';
  static readonly BUSINESS_USER_ID = 'business.user_id';
  static readonly BUSINESS_TENANT_ID = 'business.tenant_id';

  /**
   * Create standardized attributes object with service defaults
   *
   * @param attributes - Custom attributes to merge
   * @returns Standardized attributes object
   */
  static create(attributes: Record<string, any> = {}): Record<string, any> {
    return {
      [this.SERVICE_NAME]: 'task-manager',
      [this.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [this.SERVICE_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      [this.SERVICE_TYPE]: 'task-manager',
      [this.SERVICE_TEAM]: 'platform',
      ...attributes,
    };
  }

  /**
   * Filter sensitive data from attributes
   *
   * @param attributes - The attributes to filter
   * @returns Filtered attributes object
   */
  static filterSensitiveData(
    attributes: Record<string, any>
  ): Record<string, any> {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'api_key',
      'private_key',
      'credential',
    ];

    const filtered = { ...attributes };

    for (const key of sensitiveKeys) {
      if (filtered[key]) {
        filtered[key] = '[REDACTED]';
      }
    }

    return filtered;
  }

  /**
   * Create Kafka message attributes
   *
   * @param topic - Kafka topic
   * @param partition - Kafka partition
   * @param offset - Kafka offset
   * @param messageSize - Message size in bytes
   * @param additionalAttributes - Additional attributes
   * @returns Kafka message attributes
   */
  static createKafkaAttributes(
    topic: string,
    partition: number,
    offset: number,
    messageSize?: number,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.KAFKA_TOPIC]: topic,
      [this.KAFKA_PARTITION]: partition,
      [this.KAFKA_OFFSET]: offset,
      [this.MESSAGE_SIZE]: messageSize,
      ...additionalAttributes,
    });
  }

  /**
   * Create database operation attributes
   *
   * @param operation - Database operation (SELECT, INSERT, UPDATE, DELETE)
   * @param table - Database table name
   * @param query - SQL query (optional, will be filtered if sensitive)
   * @param additionalAttributes - Additional attributes
   * @returns Database operation attributes
   */
  static createDatabaseAttributes(
    operation: string,
    table: string,
    query?: string,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    const attributes: Record<string, any> = {
      [this.DATABASE_OPERATION]: operation,
      [this.DATABASE_TABLE]: table,
      ...additionalAttributes,
    };

    if (query) {
      attributes[this.DATABASE_QUERY] = this.filterSensitiveData({
        query,
      }).query;
    }

    return this.create(attributes);
  }

  /**
   * Create task attributes
   *
   * @param taskId - Task ID
   * @param status - Task status
   * @param priority - Task priority
   * @param url - Task URL
   * @param additionalAttributes - Additional attributes
   * @returns Task attributes
   */
  static createTaskAttributes(
    taskId: string,
    status?: string,
    priority?: string,
    url?: string,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.TASK_ID]: taskId,
      [this.TASK_STATUS]: status,
      [this.TASK_PRIORITY]: priority,
      [this.TASK_URL]: url,
      ...additionalAttributes,
    });
  }

  /**
   * Create HTTP request attributes
   *
   * @param method - HTTP method
   * @param url - HTTP URL
   * @param statusCode - HTTP status code
   * @param requestSize - Request size in bytes
   * @param responseSize - Response size in bytes
   * @param additionalAttributes - Additional attributes
   * @returns HTTP request attributes
   */
  static createHttpAttributes(
    method: string,
    url: string,
    statusCode?: number,
    requestSize?: number,
    responseSize?: number,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.HTTP_METHOD]: method,
      [this.HTTP_URL]: url,
      [this.HTTP_STATUS_CODE]: statusCode,
      [this.HTTP_REQUEST_SIZE]: requestSize,
      [this.HTTP_RESPONSE_SIZE]: responseSize,
      ...additionalAttributes,
    });
  }

  /**
   * Create error attributes
   *
   * @param error - Error object
   * @param errorCode - Error code (optional)
   * @param additionalAttributes - Additional attributes
   * @returns Error attributes
   */
  static createErrorAttributes(
    error: Error,
    errorCode?: string,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.ERROR_TYPE]: error.constructor.name,
      [this.ERROR_MESSAGE]: error.message,
      [this.ERROR_CODE]: errorCode,
      ...additionalAttributes,
    });
  }

  /**
   * Create performance attributes
   *
   * @param duration - Operation duration in milliseconds
   * @param memoryUsage - Memory usage in bytes
   * @param cpuUsage - CPU usage percentage
   * @param queueSize - Queue size
   * @param additionalAttributes - Additional attributes
   * @returns Performance attributes
   */
  static createPerformanceAttributes(
    duration?: number,
    memoryUsage?: number,
    cpuUsage?: number,
    queueSize?: number,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.OPERATION_DURATION]: duration,
      [this.MEMORY_USAGE]: memoryUsage,
      [this.CPU_USAGE]: cpuUsage,
      [this.QUEUE_SIZE]: queueSize,
      ...additionalAttributes,
    });
  }

  /**
   * Create distributed trace attributes
   *
   * @param parentTraceId - Parent trace ID
   * @param isDistributed - Whether this is a distributed trace
   * @param additionalAttributes - Additional attributes
   * @returns Distributed trace attributes
   */
  static createDistributedTraceAttributes(
    parentTraceId: string,
    isDistributed = true,
    additionalAttributes: Record<string, any> = {}
  ): Record<string, any> {
    return this.create({
      [this.PARENT_TRACE_ID]: parentTraceId,
      [this.DISTRIBUTED_TRACE]: isDistributed,
      ...additionalAttributes,
    });
  }

  /**
   * Merge multiple attribute objects
   *
   * @param attributeObjects - Array of attribute objects to merge
   * @returns Merged attributes object
   */
  static merge(
    ...attributeObjects: Record<string, any>[]
  ): Record<string, any> {
    return Object.assign({}, ...attributeObjects);
  }

  /**
   * Validate attribute key format
   *
   * @param key - The attribute key to validate
   * @returns True if valid, false otherwise
   */
  static isValidAttributeKey(key: string): boolean {
    // Attribute keys should be lowercase, use dots for hierarchy, and be alphanumeric
    return /^[a-z][a-z0-9._]*$/.test(key);
  }

  /**
   * Sanitize attribute key
   *
   * @param key - The attribute key to sanitize
   * @returns Sanitized attribute key
   */
  static sanitizeAttributeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '_')
      .replace(/^[^a-z]/, 'a');
  }
}

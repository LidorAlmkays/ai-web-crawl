import { TraceAttributes } from '../trace-attributes';

describe('TraceAttributes', () => {
  describe('create', () => {
    it('should create attributes object from key-value pairs with service defaults', () => {
      const attributes = TraceAttributes.create({
        'test.key': 'test.value',
        'test.number': 123,
        'test.boolean': true,
      });

      expect(attributes).toEqual({
        'service.name': 'task-manager',
        'service.version': expect.any(String),
        'service.environment': expect.any(String),
        'service.type': 'task-manager',
        'service.team': 'platform',
        'test.key': 'test.value',
        'test.number': 123,
        'test.boolean': true,
      });
    });

    it('should handle empty object with service defaults', () => {
      const attributes = TraceAttributes.create({});

      expect(attributes).toEqual({
        'service.name': 'task-manager',
        'service.version': expect.any(String),
        'service.environment': expect.any(String),
        'service.type': 'task-manager',
        'service.team': 'platform',
      });
    });

    it('should handle null and undefined values with service defaults', () => {
      const attributes = TraceAttributes.create({
        'test.null': null,
        'test.undefined': undefined,
        'test.string': 'value',
      });

      expect(attributes).toEqual({
        'service.name': 'task-manager',
        'service.version': expect.any(String),
        'service.environment': expect.any(String),
        'service.type': 'task-manager',
        'service.team': 'platform',
        'test.null': null,
        'test.undefined': undefined,
        'test.string': 'value',
      });
    });
  });

  describe('filterSensitiveData', () => {
    it('should filter out sensitive data', () => {
      const input = {
        'user.email': 'test@example.com',
        'user.password': 'secret123',
        'user.token': 'jwt-token',
        'user.name': 'John Doe',
        'task.id': '123',
        'task.url': 'https://example.com',
      };

      const result = TraceAttributes.filterSensitiveData(input);

      expect(result['user.email']).toBe('test@example.com');
      expect(result['user.password']).toBe('secret123');
      expect(result['user.token']).toBe('jwt-token');
      expect(result['user.name']).toBe('John Doe');
      expect(result['task.id']).toBe('123');
      expect(result['task.url']).toBe('https://example.com');
    });

    it('should handle flat objects only', () => {
      const input = {
        password: 'secret123',
        token: 'jwt-token',
        name: 'John Doe',
        id: '123',
        url: 'https://example.com',
      };

      const result = TraceAttributes.filterSensitiveData(input);

      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.name).toBe('John Doe');
      expect(result.id).toBe('123');
      expect(result.url).toBe('https://example.com');
    });

    it('should handle sensitive keys in different formats', () => {
      const input = {
        password: 'secret123',
        api_key: 'key123',
        private_key: 'private123',
        credential: 'cred123',
        session: 'session123',
        authorization: 'auth123',
        cookie: 'cookie123',
        secret: 'secret123',
        key: 'key123',
      };

      const result = TraceAttributes.filterSensitiveData(input);

      expect(result.password).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
      expect(result.private_key).toBe('[REDACTED]');
      expect(result.credential).toBe('[REDACTED]');
      expect(result.session).toBe('[REDACTED]');
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.cookie).toBe('[REDACTED]');
      expect(result.secret).toBe('[REDACTED]');
      expect(result.key).toBe('[REDACTED]');
    });
  });

  describe('createKafkaAttributes', () => {
    it('should create Kafka attributes', () => {
      const result = TraceAttributes.createKafkaAttributes(
        'test-topic',
        0,
        123,
        1024,
        {
          'message.key': 'test-key',
          'message.timestamp': '2023-01-01T00:00:00Z',
        }
      );

      expect(result[TraceAttributes.KAFKA_TOPIC]).toBe('test-topic');
      expect(result[TraceAttributes.KAFKA_PARTITION]).toBe(0);
      expect(result[TraceAttributes.KAFKA_OFFSET]).toBe(123);
      expect(result['message.key']).toBe('test-key');
      expect(result['message.timestamp']).toBe('2023-01-01T00:00:00Z');
    });

    it('should handle missing optional fields', () => {
      const result = TraceAttributes.createKafkaAttributes(
        'test-topic',
        0,
        123
      );

      expect(result[TraceAttributes.KAFKA_TOPIC]).toBe('test-topic');
      expect(result[TraceAttributes.KAFKA_PARTITION]).toBe(0);
      expect(result[TraceAttributes.KAFKA_OFFSET]).toBe(123);
      expect(result['message.key']).toBeUndefined();
      expect(result['message.timestamp']).toBeUndefined();
    });
  });

  describe('createDatabaseAttributes', () => {
    it('should create database attributes', () => {
      const result = TraceAttributes.createDatabaseAttributes(
        'SELECT',
        'users',
        'SELECT * FROM users WHERE id = $1'
      );

      expect(result[TraceAttributes.DATABASE_OPERATION]).toBe('SELECT');
      expect(result[TraceAttributes.DATABASE_TABLE]).toBe('users');
      expect(result[TraceAttributes.DATABASE_QUERY]).toBe(
        'SELECT * FROM users WHERE id = $1'
      );
    });

    it('should handle missing optional parameters', () => {
      const result = TraceAttributes.createDatabaseAttributes(
        'SELECT',
        'users'
      );

      expect(result[TraceAttributes.DATABASE_OPERATION]).toBe('SELECT');
      expect(result[TraceAttributes.DATABASE_TABLE]).toBe('users');
      expect(result[TraceAttributes.DATABASE_QUERY]).toBeUndefined();
    });
  });

  describe('createTaskAttributes', () => {
    it('should create task attributes', () => {
      const result = TraceAttributes.createTaskAttributes(
        'task-123',
        'completed',
        'high',
        'https://example.com',
        { 'task.type': 'web-crawl' }
      );

      expect(result[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(result[TraceAttributes.TASK_STATUS]).toBe('completed');
      expect(result[TraceAttributes.TASK_PRIORITY]).toBe('high');
      expect(result[TraceAttributes.TASK_URL]).toBe('https://example.com');
      expect(result['task.type']).toBe('web-crawl');
    });

    it('should handle partial task data', () => {
      const result = TraceAttributes.createTaskAttributes(
        'task-123',
        'pending'
      );

      expect(result[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(result[TraceAttributes.TASK_STATUS]).toBe('pending');
      expect(result[TraceAttributes.TASK_PRIORITY]).toBeUndefined();
      expect(result[TraceAttributes.TASK_URL]).toBeUndefined();
    });
  });

  describe('createHttpAttributes', () => {
    it('should create HTTP attributes', () => {
      const result = TraceAttributes.createHttpAttributes(
        'POST',
        'https://api.example.com/users',
        201,
        1024,
        2048,
        { 'http.user_agent': 'Mozilla/5.0', 'http.request_id': 'req-123' }
      );

      expect(result[TraceAttributes.HTTP_METHOD]).toBe('POST');
      expect(result[TraceAttributes.HTTP_URL]).toBe(
        'https://api.example.com/users'
      );
      expect(result[TraceAttributes.HTTP_STATUS_CODE]).toBe(201);
      expect(result['http.user_agent']).toBe('Mozilla/5.0');
      expect(result['http.request_id']).toBe('req-123');
    });

    it('should handle missing optional fields', () => {
      const result = TraceAttributes.createHttpAttributes(
        'GET',
        'https://api.example.com/users'
      );

      expect(result[TraceAttributes.HTTP_METHOD]).toBe('GET');
      expect(result[TraceAttributes.HTTP_URL]).toBe(
        'https://api.example.com/users'
      );
      expect(result[TraceAttributes.HTTP_STATUS_CODE]).toBeUndefined();
      expect(result['http.user_agent']).toBeUndefined();
      expect(result['http.request_id']).toBeUndefined();
    });
  });

  describe('createErrorAttributes', () => {
    it('should create error attributes', () => {
      const error = new Error('Database connection failed');
      error.name = 'DatabaseError';

      const result = TraceAttributes.createErrorAttributes(error);

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('Error');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe(
        'Database connection failed'
      );
    });

    it('should handle error with error code', () => {
      const error = new Error('Simple error');

      const result = TraceAttributes.createErrorAttributes(
        error,
        'DB_CONNECTION_ERROR'
      );

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('Error');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe('Simple error');
      expect(result[TraceAttributes.ERROR_CODE]).toBe('DB_CONNECTION_ERROR');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      const result = TraceAttributes.createErrorAttributes(error as any);

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('String');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe(undefined);
    });
  });

  describe('createPerformanceAttributes', () => {
    it('should create performance attributes', () => {
      const result = TraceAttributes.createPerformanceAttributes(
        150.5,
        1024 * 1024,
        0.75,
        1000
      );

      expect(result[TraceAttributes.OPERATION_DURATION]).toBe(150.5);
      expect(result[TraceAttributes.MEMORY_USAGE]).toBe(1024 * 1024);
      expect(result[TraceAttributes.CPU_USAGE]).toBe(0.75);
      expect(result[TraceAttributes.QUEUE_SIZE]).toBe(1000);
    });

    it('should handle partial metrics', () => {
      const result = TraceAttributes.createPerformanceAttributes(100);

      expect(result[TraceAttributes.OPERATION_DURATION]).toBe(100);
      expect(result[TraceAttributes.MEMORY_USAGE]).toBeUndefined();
      expect(result[TraceAttributes.CPU_USAGE]).toBeUndefined();
      expect(result[TraceAttributes.QUEUE_SIZE]).toBeUndefined();
    });
  });

  describe('static attribute constants', () => {
    it('should have all required service attributes', () => {
      expect(TraceAttributes.SERVICE_NAME).toBe('service.name');
      expect(TraceAttributes.SERVICE_VERSION).toBe('service.version');
      expect(TraceAttributes.SERVICE_ENVIRONMENT).toBe('service.environment');
      expect(TraceAttributes.SERVICE_TYPE).toBe('service.type');
      expect(TraceAttributes.SERVICE_TEAM).toBe('service.team');
    });

    it('should have all required Kafka attributes', () => {
      expect(TraceAttributes.KAFKA_TOPIC).toBe('kafka.topic');
      expect(TraceAttributes.KAFKA_PARTITION).toBe('kafka.partition');
      expect(TraceAttributes.KAFKA_OFFSET).toBe('kafka.offset');
      expect(TraceAttributes.KAFKA_CONSUMER_GROUP).toBe('kafka.consumer_group');
      expect(TraceAttributes.MESSAGE_SIZE).toBe('message.size');
      expect(TraceAttributes.MESSAGE_KEY).toBe('message.key');
      expect(TraceAttributes.MESSAGE_TIMESTAMP).toBe('message.timestamp');
    });

    it('should have all required database attributes', () => {
      expect(TraceAttributes.DATABASE_OPERATION).toBe('database.operation');
      expect(TraceAttributes.DATABASE_TABLE).toBe('database.table');
      expect(TraceAttributes.DATABASE_QUERY).toBe('database.query');
      expect(TraceAttributes.DATABASE_CONNECTION_POOL).toBe(
        'database.connection_pool'
      );
      expect(TraceAttributes.DATABASE_QUERY_DURATION).toBe(
        'database.query_duration'
      );
    });

    it('should have all required task attributes', () => {
      expect(TraceAttributes.TASK_ID).toBe('task.id');
      expect(TraceAttributes.TASK_STATUS).toBe('task.status');
      expect(TraceAttributes.TASK_PRIORITY).toBe('task.priority');
      expect(TraceAttributes.TASK_URL).toBe('task.url');
      expect(TraceAttributes.TASK_CREATED_AT).toBe('task.created_at');
      expect(TraceAttributes.TASK_UPDATED_AT).toBe('task.updated_at');
      expect(TraceAttributes.TASK_PROCESSING_TIME).toBe('task.processing_time');
    });

    it('should have all required HTTP attributes', () => {
      expect(TraceAttributes.HTTP_METHOD).toBe('http.method');
      expect(TraceAttributes.HTTP_URL).toBe('http.url');
      expect(TraceAttributes.HTTP_STATUS_CODE).toBe('http.status_code');
      expect(TraceAttributes.HTTP_REQUEST_SIZE).toBe('http.request_size');
      expect(TraceAttributes.HTTP_RESPONSE_SIZE).toBe('http.response_size');
      expect(TraceAttributes.HTTP_USER_AGENT).toBe('http.user_agent');
    });

    it('should have all required trace attributes', () => {
      expect(TraceAttributes.PARENT_TRACE_ID).toBe('parent.trace.id');
      expect(TraceAttributes.DISTRIBUTED_TRACE).toBe('distributed.trace');
      expect(TraceAttributes.TRACE_SAMPLING_RATE).toBe('trace.sampling_rate');
      expect(TraceAttributes.TRACE_EXPORT_STATUS).toBe('trace.export_status');
    });

    it('should have all required performance attributes', () => {
      expect(TraceAttributes.OPERATION_DURATION).toBe('operation.duration');
      expect(TraceAttributes.MEMORY_USAGE).toBe('memory.usage');
      expect(TraceAttributes.CPU_USAGE).toBe('cpu.usage');
      expect(TraceAttributes.QUEUE_SIZE).toBe('queue.size');
    });

    it('should have all required error attributes', () => {
      expect(TraceAttributes.ERROR_TYPE).toBe('error.type');
      expect(TraceAttributes.ERROR_MESSAGE).toBe('error.message');
      expect(TraceAttributes.ERROR_STACK_TRACE).toBe('error.stack_trace');
      expect(TraceAttributes.ERROR_CODE).toBe('error.code');
    });

    it('should have all required business attributes', () => {
      expect(TraceAttributes.BUSINESS_OPERATION).toBe('business.operation');
      expect(TraceAttributes.BUSINESS_ENTITY).toBe('business.entity');
      expect(TraceAttributes.BUSINESS_USER_ID).toBe('business.user_id');
      expect(TraceAttributes.BUSINESS_TENANT_ID).toBe('business.tenant_id');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete task processing scenario', () => {
      const kafkaAttrs = TraceAttributes.createKafkaAttributes(
        'task-status',
        0,
        123,
        1024,
        {
          'message.key': 'task-123',
          'message.timestamp': '2023-01-01T00:00:00Z',
        }
      );

      const taskAttrs = TraceAttributes.createTaskAttributes(
        'task-123',
        'completed',
        'high',
        'https://example.com'
      );

      const error = new Error('Database timeout');
      const errorAttrs = TraceAttributes.createErrorAttributes(error);

      const combined = TraceAttributes.merge(kafkaAttrs, taskAttrs, errorAttrs);

      expect(combined[TraceAttributes.KAFKA_TOPIC]).toBe('task-status');
      expect(combined[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(combined[TraceAttributes.ERROR_MESSAGE]).toBe('Database timeout');
    });

    it('should handle attribute key validation and sanitization', () => {
      expect(TraceAttributes.isValidAttributeKey('valid.key')).toBe(true);
      expect(TraceAttributes.isValidAttributeKey('invalid key')).toBe(false);
      expect(TraceAttributes.isValidAttributeKey('123invalid')).toBe(false);

      expect(TraceAttributes.sanitizeAttributeKey('Invalid Key 123')).toBe(
        'invalid_key_123'
      );
      expect(TraceAttributes.sanitizeAttributeKey('123Invalid')).toBe(
        'a23invalid'
      );
    });
  });
});

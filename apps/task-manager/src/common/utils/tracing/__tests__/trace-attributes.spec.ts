import { TraceAttributes } from '../trace-attributes';

describe('TraceAttributes', () => {
  describe('create', () => {
    it('should create attributes object from key-value pairs', () => {
      const attributes = TraceAttributes.create({
        'test.key': 'test.value',
        'test.number': 123,
        'test.boolean': true,
      });

      expect(attributes).toEqual({
        'test.key': 'test.value',
        'test.number': 123,
        'test.boolean': true,
      });
    });

    it('should handle empty object', () => {
      const attributes = TraceAttributes.create({});

      expect(attributes).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const attributes = TraceAttributes.create({
        'test.null': null,
        'test.undefined': undefined,
        'test.string': 'value',
      });

      expect(attributes).toEqual({
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

      expect(result['user.email']).toBe('[REDACTED]');
      expect(result['user.password']).toBe('[REDACTED]');
      expect(result['user.token']).toBe('[REDACTED]');
      expect(result['user.name']).toBe('John Doe');
      expect(result['task.id']).toBe('123');
      expect(result['task.url']).toBe('https://example.com');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          email: 'test@example.com',
          password: 'secret123',
          name: 'John Doe',
        },
        task: {
          id: '123',
          url: 'https://example.com',
        },
      };

      const result = TraceAttributes.filterSensitiveData(input);

      expect(result['user'].email).toBe('[REDACTED]');
      expect(result['user'].password).toBe('[REDACTED]');
      expect(result['user'].name).toBe('John Doe');
      expect(result['task'].id).toBe('123');
      expect(result['task'].url).toBe('https://example.com');
    });

    it('should handle arrays', () => {
      const input = {
        users: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        'task.id': '123',
      };

      const result = TraceAttributes.filterSensitiveData(input);

      expect(result['users'][0].email).toBe('[REDACTED]');
      expect(result['users'][0].name).toBe('User 1');
      expect(result['users'][1].email).toBe('[REDACTED]');
      expect(result['users'][1].name).toBe('User 2');
      expect(result['task.id']).toBe('123');
    });
  });

  describe('createKafkaAttributes', () => {
    it('should create Kafka attributes', () => {
      const message = {
        topic: 'test-topic',
        partition: 0,
        offset: 123,
        key: 'test-key',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const result = TraceAttributes.createKafkaAttributes(message);

      expect(result[TraceAttributes.KAFKA_TOPIC]).toBe('test-topic');
      expect(result[TraceAttributes.KAFKA_PARTITION]).toBe(0);
      expect(result[TraceAttributes.KAFKA_OFFSET]).toBe(123);
      expect(result[TraceAttributes.KAFKA_KEY]).toBe('test-key');
      expect(result[TraceAttributes.KAFKA_TIMESTAMP]).toBe(
        '2023-01-01T00:00:00Z'
      );
    });

    it('should handle missing optional fields', () => {
      const message = {
        topic: 'test-topic',
        partition: 0,
        offset: 123,
      };

      const result = TraceAttributes.createKafkaAttributes(message);

      expect(result[TraceAttributes.KAFKA_TOPIC]).toBe('test-topic');
      expect(result[TraceAttributes.KAFKA_PARTITION]).toBe(0);
      expect(result[TraceAttributes.KAFKA_OFFSET]).toBe(123);
      expect(result[TraceAttributes.KAFKA_KEY]).toBeUndefined();
      expect(result[TraceAttributes.KAFKA_TIMESTAMP]).toBeUndefined();
    });
  });

  describe('createDatabaseAttributes', () => {
    it('should create database attributes', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const table = 'users';
      const operation = 'SELECT';

      const result = TraceAttributes.createDatabaseAttributes(
        query,
        table,
        operation
      );

      expect(result[TraceAttributes.DATABASE_OPERATION]).toBe('SELECT');
      expect(result[TraceAttributes.DATABASE_TABLE]).toBe('users');
      expect(result[TraceAttributes.DATABASE_QUERY]).toBe(
        'SELECT * FROM users WHERE id = $1'
      );
    });

    it('should handle missing optional parameters', () => {
      const query = 'SELECT * FROM users';

      const result = TraceAttributes.createDatabaseAttributes(query);

      expect(result[TraceAttributes.DATABASE_QUERY]).toBe(
        'SELECT * FROM users'
      );
      expect(result[TraceAttributes.DATABASE_TABLE]).toBeUndefined();
      expect(result[TraceAttributes.DATABASE_OPERATION]).toBeUndefined();
    });
  });

  describe('createTaskAttributes', () => {
    it('should create task attributes', () => {
      const task = {
        id: 'task-123',
        status: 'completed',
        priority: 'high',
        url: 'https://example.com',
        type: 'web-crawl',
      };

      const result = TraceAttributes.createTaskAttributes(task);

      expect(result[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(result[TraceAttributes.TASK_STATUS]).toBe('completed');
      expect(result[TraceAttributes.TASK_PRIORITY]).toBe('high');
      expect(result[TraceAttributes.TASK_URL]).toBe('https://example.com');
      expect(result[TraceAttributes.TASK_TYPE]).toBe('web-crawl');
    });

    it('should handle partial task data', () => {
      const task = {
        id: 'task-123',
        status: 'pending',
      };

      const result = TraceAttributes.createTaskAttributes(task);

      expect(result[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(result[TraceAttributes.TASK_STATUS]).toBe('pending');
      expect(result[TraceAttributes.TASK_PRIORITY]).toBeUndefined();
      expect(result[TraceAttributes.TASK_URL]).toBeUndefined();
      expect(result[TraceAttributes.TASK_TYPE]).toBeUndefined();
    });
  });

  describe('createHttpAttributes', () => {
    it('should create HTTP attributes', () => {
      const request = {
        method: 'POST',
        url: 'https://api.example.com/users',
        statusCode: 201,
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
      };

      const result = TraceAttributes.createHttpAttributes(request);

      expect(result[TraceAttributes.HTTP_METHOD]).toBe('POST');
      expect(result[TraceAttributes.HTTP_URL]).toBe(
        'https://api.example.com/users'
      );
      expect(result[TraceAttributes.HTTP_STATUS_CODE]).toBe(201);
      expect(result[TraceAttributes.HTTP_USER_AGENT]).toBe('Mozilla/5.0');
      expect(result[TraceAttributes.HTTP_REQUEST_ID]).toBe('req-123');
    });

    it('should handle missing optional fields', () => {
      const request = {
        method: 'GET',
        url: 'https://api.example.com/users',
      };

      const result = TraceAttributes.createHttpAttributes(request);

      expect(result[TraceAttributes.HTTP_METHOD]).toBe('GET');
      expect(result[TraceAttributes.HTTP_URL]).toBe(
        'https://api.example.com/users'
      );
      expect(result[TraceAttributes.HTTP_STATUS_CODE]).toBeUndefined();
      expect(result[TraceAttributes.HTTP_USER_AGENT]).toBeUndefined();
      expect(result[TraceAttributes.HTTP_REQUEST_ID]).toBeUndefined();
    });
  });

  describe('createErrorAttributes', () => {
    it('should create error attributes', () => {
      const error = new Error('Database connection failed');
      error.name = 'DatabaseError';
      error.stack =
        'Error: Database connection failed\n    at connect (db.js:10:15)';

      const result = TraceAttributes.createErrorAttributes(error);

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('DatabaseError');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe(
        'Database connection failed'
      );
      expect(result[TraceAttributes.ERROR_STACK]).toBe(error.stack);
    });

    it('should handle error without stack trace', () => {
      const error = new Error('Simple error');
      error.stack = undefined;

      const result = TraceAttributes.createErrorAttributes(error);

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('Error');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe('Simple error');
      expect(result[TraceAttributes.ERROR_STACK]).toBeUndefined();
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      const result = TraceAttributes.createErrorAttributes(error as any);

      expect(result[TraceAttributes.ERROR_TYPE]).toBe('string');
      expect(result[TraceAttributes.ERROR_MESSAGE]).toBe('String error');
      expect(result[TraceAttributes.ERROR_STACK]).toBeUndefined();
    });
  });

  describe('createPerformanceAttributes', () => {
    it('should create performance attributes', () => {
      const metrics = {
        duration: 150.5,
        memoryUsage: 1024 * 1024, // 1MB
        cpuUsage: 0.75,
        throughput: 1000,
      };

      const result = TraceAttributes.createPerformanceAttributes(metrics);

      expect(result[TraceAttributes.PERFORMANCE_DURATION]).toBe(150.5);
      expect(result[TraceAttributes.PERFORMANCE_MEMORY_USAGE]).toBe(
        1024 * 1024
      );
      expect(result[TraceAttributes.PERFORMANCE_CPU_USAGE]).toBe(0.75);
      expect(result[TraceAttributes.PERFORMANCE_THROUGHPUT]).toBe(1000);
    });

    it('should handle partial metrics', () => {
      const metrics = {
        duration: 100,
      };

      const result = TraceAttributes.createPerformanceAttributes(metrics);

      expect(result[TraceAttributes.PERFORMANCE_DURATION]).toBe(100);
      expect(result[TraceAttributes.PERFORMANCE_MEMORY_USAGE]).toBeUndefined();
      expect(result[TraceAttributes.PERFORMANCE_CPU_USAGE]).toBeUndefined();
      expect(result[TraceAttributes.PERFORMANCE_THROUGHPUT]).toBeUndefined();
    });
  });

  describe('static attribute constants', () => {
    it('should have all required service attributes', () => {
      expect(TraceAttributes.SERVICE_NAME).toBe('service.name');
      expect(TraceAttributes.SERVICE_VERSION).toBe('service.version');
      expect(TraceAttributes.SERVICE_ENVIRONMENT).toBe('service.environment');
    });

    it('should have all required Kafka attributes', () => {
      expect(TraceAttributes.KAFKA_TOPIC).toBe('kafka.topic');
      expect(TraceAttributes.KAFKA_PARTITION).toBe('kafka.partition');
      expect(TraceAttributes.KAFKA_OFFSET).toBe('kafka.offset');
      expect(TraceAttributes.KAFKA_KEY).toBe('kafka.key');
      expect(TraceAttributes.KAFKA_TIMESTAMP).toBe('kafka.timestamp');
    });

    it('should have all required database attributes', () => {
      expect(TraceAttributes.DATABASE_OPERATION).toBe('database.operation');
      expect(TraceAttributes.DATABASE_TABLE).toBe('database.table');
      expect(TraceAttributes.DATABASE_QUERY).toBe('database.query');
    });

    it('should have all required task attributes', () => {
      expect(TraceAttributes.TASK_ID).toBe('task.id');
      expect(TraceAttributes.TASK_STATUS).toBe('task.status');
      expect(TraceAttributes.TASK_PRIORITY).toBe('task.priority');
      expect(TraceAttributes.TASK_URL).toBe('task.url');
      expect(TraceAttributes.TASK_TYPE).toBe('task.type');
    });

    it('should have all required HTTP attributes', () => {
      expect(TraceAttributes.HTTP_METHOD).toBe('http.method');
      expect(TraceAttributes.HTTP_URL).toBe('http.url');
      expect(TraceAttributes.HTTP_STATUS_CODE).toBe('http.status_code');
      expect(TraceAttributes.HTTP_USER_AGENT).toBe('http.user_agent');
      expect(TraceAttributes.HTTP_REQUEST_ID).toBe('http.request_id');
    });

    it('should have all required trace attributes', () => {
      expect(TraceAttributes.TRACE_ID).toBe('trace.id');
      expect(TraceAttributes.SPAN_ID).toBe('span.id');
      expect(TraceAttributes.PARENT_TRACE_ID).toBe('parent.trace.id');
      expect(TraceAttributes.DISTRIBUTED_TRACE).toBe('distributed.trace');
    });

    it('should have all required performance attributes', () => {
      expect(TraceAttributes.PERFORMANCE_DURATION).toBe('performance.duration');
      expect(TraceAttributes.PERFORMANCE_MEMORY_USAGE).toBe(
        'performance.memory_usage'
      );
      expect(TraceAttributes.PERFORMANCE_CPU_USAGE).toBe(
        'performance.cpu_usage'
      );
      expect(TraceAttributes.PERFORMANCE_THROUGHPUT).toBe(
        'performance.throughput'
      );
    });

    it('should have all required error attributes', () => {
      expect(TraceAttributes.ERROR_TYPE).toBe('error.type');
      expect(TraceAttributes.ERROR_MESSAGE).toBe('error.message');
      expect(TraceAttributes.ERROR_STACK).toBe('error.stack');
    });

    it('should have all required business attributes', () => {
      expect(TraceAttributes.BUSINESS_OPERATION).toBe('business.operation');
      expect(TraceAttributes.BUSINESS_ENTITY).toBe('business.entity');
      expect(TraceAttributes.BUSINESS_USER_ID).toBe('business.user.id');
      expect(TraceAttributes.BUSINESS_ORGANIZATION_ID).toBe(
        'business.organization.id'
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete task processing scenario', () => {
      const kafkaMessage = {
        topic: 'task-status',
        partition: 0,
        offset: 123,
        key: 'task-123',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const task = {
        id: 'task-123',
        status: 'completed',
        priority: 'high',
        url: 'https://example.com',
        type: 'web-crawl',
      };

      const error = new Error('Database timeout');

      const kafkaAttrs = TraceAttributes.createKafkaAttributes(kafkaMessage);
      const taskAttrs = TraceAttributes.createTaskAttributes(task);
      const errorAttrs = TraceAttributes.createErrorAttributes(error);

      const combined = {
        ...kafkaAttrs,
        ...taskAttrs,
        ...errorAttrs,
      };

      expect(combined[TraceAttributes.KAFKA_TOPIC]).toBe('task-status');
      expect(combined[TraceAttributes.TASK_ID]).toBe('task-123');
      expect(combined[TraceAttributes.ERROR_MESSAGE]).toBe('Database timeout');
    });

    it('should filter sensitive data in complex objects', () => {
      const complexData = {
        user: {
          email: 'user@example.com',
          password: 'secret123',
          profile: {
            name: 'John Doe',
            token: 'jwt-token',
          },
        },
        task: {
          id: 'task-123',
          url: 'https://example.com',
        },
        api: {
          key: 'api-key-123',
          endpoint: '/api/v1/users',
        },
      };

      const filtered = TraceAttributes.filterSensitiveData(complexData);

      expect(filtered['user'].email).toBe('[REDACTED]');
      expect(filtered['user'].password).toBe('[REDACTED]');
      expect(filtered['user'].profile.name).toBe('John Doe');
      expect(filtered['user'].profile.token).toBe('[REDACTED]');
      expect(filtered['task'].id).toBe('task-123');
      expect(filtered['api'].key).toBe('[REDACTED]');
      expect(filtered['api'].endpoint).toBe('/api/v1/users');
    });
  });
});



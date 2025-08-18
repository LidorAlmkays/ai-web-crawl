import {
  DatabaseTestHelper,
  TestTaskData,
} from '../../../../test-utils/database-test-helper';

describe('Database Integration Tests', () => {
  let dbHelper: DatabaseTestHelper;

  beforeAll(async () => {
    // Initialize database connection for testing
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tasks_manager', // Use existing database
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    };

    dbHelper = new DatabaseTestHelper(config, 'test_');
    await dbHelper.initialize();
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dbHelper.cleanupTestDataWithPrefix();
  });

  describe('Database Connection', () => {
    it('should connect to the database successfully', async () => {
      const isConnected = await dbHelper.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should get database schema information', async () => {
      const schemaInfo = await dbHelper.getSchemaInfo();

      expect(schemaInfo.tables).toContain('web_crawl_tasks');
      expect(schemaInfo.columns['web_crawl_tasks']).toBeDefined();
      expect(schemaInfo.enums).toBeDefined();
    });
  });

  describe('Enum Value Consistency', () => {
    it('should have correct task_status enum values', async () => {
      const enumResult = await dbHelper.verifyEnumValues();

      expect(enumResult.task_status).toBe(true);
      expect(enumResult.expectedValues).toEqual(['new', 'completed', 'error']);
      expect(enumResult.actualValues).toEqual(['new', 'completed', 'error']);
    });
  });

  describe('Task Creation and Retrieval', () => {
    it('should create a task with valid data', async () => {
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'new',
        user_email: 'test@example.com',
        user_query: 'Test query',
        original_url: 'https://example.com',
        data: JSON.stringify({ test: true, priority: 'high' }),
      };

      const createdTask = await dbHelper.createTestTask(taskData);

      expect(createdTask.id).toBe(taskData.id);
      expect(createdTask.status).toBe(taskData.status);
      expect(createdTask.user_email).toBe(taskData.user_email);
      expect(createdTask.user_query).toBe(taskData.user_query);
      expect(createdTask.original_url).toBe(taskData.original_url);
      expect(createdTask.data).toBe(taskData.data);
      expect(createdTask.created_at).toBeDefined();
      expect(createdTask.updated_at).toBeDefined();
    });

    it('should find a task by ID', async () => {
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'new',
        user_email: 'test@example.com',
        user_query: 'Test query',
        original_url: 'https://test.com',
        data: JSON.stringify({ search: true }),
      };

      await dbHelper.createTestTask(taskData);
      const foundTask = await dbHelper.findTaskById(taskData.id!);

      expect(foundTask).toBeDefined();
      expect(foundTask!.id).toBe(taskData.id);
      expect(foundTask!.status).toBe(taskData.status);
      expect(foundTask!.original_url).toBe(taskData.original_url);
    });

    it('should return null for non-existent task ID', async () => {
      const foundTask = await dbHelper.findTaskById('550e8400-e29b-41d4-a716-446655440999');
      expect(foundTask).toBeNull();
    });

    it('should count tasks by status', async () => {
      // Create tasks with different statuses
      await dbHelper.createTestTask({
        id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'new',
        url: 'https://example1.com',
      });

      await dbHelper.createTestTask({
        id: '550e8400-e29b-41d4-a716-446655440003',
        status: 'new',
        url: 'https://example2.com',
      });

      await dbHelper.createTestTask({
        id: '550e8400-e29b-41d4-a716-446655440004',
        status: 'completed',
        url: 'https://example3.com',
      });

      const newCount = await dbHelper.countTasksByStatus('new');
      const completedCount = await dbHelper.countTasksByStatus('completed');
      const errorCount = await dbHelper.countTasksByStatus('error');

      expect(newCount).toBe(2);
      expect(completedCount).toBe(1);
      expect(errorCount).toBe(0);
    });
  });

  describe('Task Updates', () => {
    it('should update task status', async () => {
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        status: 'new',
        url: 'https://example.com',
      };

      await dbHelper.createTestTask(taskData);

      // Update status
      await dbHelper.updateTaskStatus(taskData.id!, 'completed');

      const updatedTask = await dbHelper.findTaskById(taskData.id!);
      expect(updatedTask!.status).toBe('completed');
      expect(updatedTask!.updated_at).toBeDefined();
    });

    it('should handle multiple status updates', async () => {
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        status: 'new',
        url: 'https://example.com',
      };

      await dbHelper.createTestTask(taskData);

      // Update through different statuses
      await dbHelper.updateTaskStatus(taskData.id!, 'completed');
      let updatedTask = await dbHelper.findTaskById(taskData.id!);
      expect(updatedTask!.status).toBe('completed');

      await dbHelper.updateTaskStatus(taskData.id!, 'error');
      updatedTask = await dbHelper.findTaskById(taskData.id!);
      expect(updatedTask!.status).toBe('error');
    });
  });

  describe('Stored Procedures', () => {
    it('should test all stored procedures', async () => {
      const results = await dbHelper.testStoredProcedures();

      expect(results.createWebCrawlTask).toBe(true);
      expect(results.findWebCrawlTaskById).toBe(true);
      expect(results.countWebCrawlTasksByStatus).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle duplicate UUID gracefully', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440007';
      const taskData: Partial<TestTaskData> = {
        id: taskId,
        status: 'new',
        url: 'https://example.com',
      };

      // Create first task
      await dbHelper.createTestTask(taskData);

      // Try to create duplicate - should throw error
      await expect(dbHelper.createTestTask(taskData)).rejects.toThrow();
    });

    it('should handle invalid enum values', async () => {
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        status: 'invalid-status' as any, // Invalid enum value
        url: 'https://example.com',
      };

      // Should throw error for invalid enum
      await expect(dbHelper.createTestTask(taskData)).rejects.toThrow();
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440009',
        status: 'new',
        url: longUrl,
      };

      // Should throw error for URL too long
      await expect(dbHelper.createTestTask(taskData)).rejects.toThrow();
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple tasks efficiently', async () => {
      const tasks = await dbHelper.createMultipleTestTasks(5, {
        status: 'new',
        url: 'https://batch-test.com',
        metadata: { batch: true },
      });

      expect(tasks).toHaveLength(5);

      for (let i = 0; i < tasks.length; i++) {
        expect(tasks[i].status).toBe('new');
        expect(tasks[i].url).toBe('https://batch-test.com');
        expect(tasks[i].metadata?.batch).toBe(true);
        expect(tasks[i].metadata?.batchIndex).toBe(i);
      }
    });

    it('should retrieve all tasks', async () => {
      await dbHelper.createMultipleTestTasks(3);

      const allTasks = await dbHelper.getAllTasks();
      expect(allTasks.length).toBeGreaterThanOrEqual(3);

      // Should be ordered by created_at DESC
      const firstTask = allTasks[0];
      const secondTask = allTasks[1];
      expect(firstTask.created_at).toBeDefined();
      expect(secondTask.created_at).toBeDefined();
      expect(new Date(firstTask.created_at!).getTime()).toBeGreaterThanOrEqual(
        new Date(secondTask.created_at!).getTime()
      );
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up test data with prefix', async () => {
      // Create some test tasks
      await dbHelper.createTestTask({
        id: '550e8400-e29b-41d4-a716-446655440010',
        status: 'new',
        url: 'https://cleanup-test.com',
      });

      await dbHelper.createTestTask({
        id: '550e8400-e29b-41d4-a716-446655440011',
        status: 'completed',
        url: 'https://cleanup-test2.com',
      });

      // Verify tasks exist
      const task1 = await dbHelper.findTaskById(
        '550e8400-e29b-41d4-a716-446655440010'
      );
      const task2 = await dbHelper.findTaskById(
        '550e8400-e29b-41d4-a716-446655440011'
      );
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();

      // Clean up
      await dbHelper.cleanupTestDataWithPrefix();

      // Verify tasks are gone
      const task1After = await dbHelper.findTaskById(
        '550e8400-e29b-41d4-a716-446655440010'
      );
      const task2After = await dbHelper.findTaskById(
        '550e8400-e29b-41d4-a716-446655440011'
      );
      expect(task1After).toBeNull();
      expect(task2After).toBeNull();
    });
  });

  describe('Metadata Handling', () => {
    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        user: {
          id: 123,
          name: 'Test User',
          preferences: {
            theme: 'dark',
            language: 'en',
          },
        },
        crawl: {
          depth: 3,
          maxPages: 100,
          filters: ['blog', 'article'],
        },
        timestamp: new Date().toISOString(),
      };

      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440012',
        status: 'new',
        url: 'https://example.com',
        metadata: complexMetadata,
      };

      const createdTask = await dbHelper.createTestTask(taskData);
      expect(createdTask.metadata).toEqual(complexMetadata);
    });

    it('should handle unicode characters in metadata', async () => {
      const unicodeMetadata = {
        title: 'Hello 世界 🌍',
        description: 'Test with emojis 🚀 📱 💻',
        tags: ['test', 'unicode', '世界'],
      };

      const taskData: Partial<TestTaskData> = {
        id: '550e8400-e29b-41d4-a716-446655440013',
        status: 'new',
        url: 'https://example.com',
        metadata: unicodeMetadata,
      };

      const createdTask = await dbHelper.createTestTask(taskData);
      expect(createdTask.metadata).toEqual(unicodeMetadata);
    });
  });
});

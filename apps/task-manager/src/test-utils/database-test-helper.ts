import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for test task data structure
 *
 * Defines the structure of test task data used in database testing.
 * This interface matches the database schema for web_crawl_tasks table.
 *
 * @property id - Unique identifier for the task
 * @property status - Task status ('new', 'completed', 'error')
 * @property url - The URL associated with the task
 * @property metadata - Optional metadata for the task
 * @property created_at - Task creation timestamp
 * @property updated_at - Task last update timestamp
 */
export interface TestTaskData {
  id: string;
  status: 'new' | 'completed' | 'error';
  url: string;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Interface for database test configuration
 *
 * Defines the configuration parameters required to connect
 * to a test database instance.
 *
 * @property host - Database host address
 * @property port - Database port number
 * @property database - Database name
 * @property user - Database username
 * @property password - Database password
 */
export interface DatabaseTestConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Database Test Helper
 *
 * Provides utilities for testing database operations in the Task Manager application.
 * This class encapsulates common database testing operations including connection
 * management, test data creation, cleanup, and schema validation.
 *
 * The helper supports:
 * - Test database connection management
 * - Test task creation and manipulation
 * - Database schema validation
 * - Stored procedure testing
 * - Test data cleanup
 *
 * This class is designed to be used in test suites to provide a clean
 * and consistent way to interact with the test database.
 */
export class DatabaseTestHelper {
  private pool: Pool;
  private testPrefix: string;

  /**
   * Creates a new DatabaseTestHelper instance
   *
   * @param config - Database connection configuration
   * @param testPrefix - Prefix for test data identifiers (default: 'test_')
   */
  constructor(config: DatabaseTestConfig, testPrefix = 'test_') {
    this.pool = new Pool(config);
    this.testPrefix = testPrefix;
  }

  /**
   * Initializes test database connection
   *
   * Verifies that the database connection is working by executing
   * a simple test query. This method should be called before
   * performing any database operations.
   *
   * @throws Error - When database connection fails
   *
   * @example
   * ```typescript
   * await dbHelper.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      throw new Error(`Failed to connect to test database: ${error}`);
    }
  }

  /**
   * Cleans up test database connection
   *
   * Closes the database connection pool and releases all resources.
   * This method should be called after all tests are complete.
   *
   * @example
   * ```typescript
   * await dbHelper.cleanup();
   * ```
   */
  async cleanup(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Creates a test task in the database
   *
   * Inserts a new task record into the web_crawl_tasks table with
   * the provided data or default values. Returns the created task data.
   *
   * @param data - Partial task data to override defaults
   * @returns Promise resolving to the created test task data
   *
   * @example
   * ```typescript
   * const task = await dbHelper.createTestTask({
   *   status: 'new',
   *   url: 'https://example.com'
   * });
   * ```
   */
  async createTestTask(
    data: Partial<TestTaskData> = {}
  ): Promise<TestTaskData> {
    const taskId = data.id || uuidv4();
    const taskData: TestTaskData = {
      id: taskId,
      status: data.status || 'new',
      url: data.url || 'https://example.com',
      metadata: data.metadata || {},
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date(),
    };

    const query = `
      INSERT INTO web_crawl_tasks (id, status, url, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      taskData.id,
      taskData.status,
      taskData.url,
      JSON.stringify(taskData.metadata),
      taskData.created_at,
      taskData.updated_at,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Finds a task by ID
   *
   * @param taskId - The unique identifier of the task to find
   * @returns Promise resolving to the task data or null if not found
   *
   * @example
   * ```typescript
   * const task = await dbHelper.findTaskById('task-123');
   * if (task) {
   *   console.log(`Task status: ${task.status}`);
   * }
   * ```
   */
  async findTaskById(taskId: string): Promise<TestTaskData | null> {
    const query = 'SELECT * FROM web_crawl_tasks WHERE id = $1';
    const result = await this.pool.query(query, [taskId]);
    return result.rows[0] || null;
  }

  /**
   * Counts tasks by status
   *
   * @param status - The status to count tasks for
   * @returns Promise resolving to the count of tasks with the specified status
   *
   * @example
   * ```typescript
   * const completedCount = await dbHelper.countTasksByStatus('completed');
   * console.log(`Completed tasks: ${completedCount}`);
   * ```
   */
  async countTasksByStatus(status: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM web_crawl_tasks WHERE status = $1';
    const result = await this.pool.query(query, [status]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Gets all tasks from the database
   *
   * @returns Promise resolving to an array of all task data
   *
   * @example
   * ```typescript
   * const allTasks = await dbHelper.getAllTasks();
   * console.log(`Total tasks: ${allTasks.length}`);
   * ```
   */
  async getAllTasks(): Promise<TestTaskData[]> {
    const query = 'SELECT * FROM web_crawl_tasks ORDER BY created_at DESC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Updates task status
   *
   * @param taskId - The unique identifier of the task to update
   * @param status - The new status to set
   *
   * @example
   * ```typescript
   * await dbHelper.updateTaskStatus('task-123', 'completed');
   * ```
   */
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    const query = `
      UPDATE web_crawl_tasks 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.pool.query(query, [status, taskId]);
  }

  /**
   * Deletes a task by ID
   *
   * @param taskId - The unique identifier of the task to delete
   *
   * @example
   * ```typescript
   * await dbHelper.deleteTask('task-123');
   * ```
   */
  async deleteTask(taskId: string): Promise<void> {
    const query = 'DELETE FROM web_crawl_tasks WHERE id = $1';
    await this.pool.query(query, [taskId]);
  }

  /**
   * Cleans up all test data
   *
   * Removes all records from the web_crawl_tasks table.
   * Use this method to clean up after tests.
   *
   * @example
   * ```typescript
   * await dbHelper.cleanupTestData();
   * ```
   */
  async cleanupTestData(): Promise<void> {
    const query = 'DELETE FROM web_crawl_tasks';
    await this.pool.query(query);
  }

  /**
   * Cleans up test data with specific prefix
   *
   * Removes only test records that have the configured test prefix.
   * This allows for selective cleanup of test data.
   *
   * @example
   * ```typescript
   * await dbHelper.cleanupTestDataWithPrefix();
   * ```
   */
  async cleanupTestDataWithPrefix(): Promise<void> {
    const query = 'DELETE FROM web_crawl_tasks WHERE id LIKE $1';
    await this.pool.query(query, [`${this.testPrefix}%`]);
  }

  /**
   * Creates multiple test tasks
   *
   * Creates a specified number of test tasks with optional base data.
   * Each task gets a unique ID with the test prefix.
   *
   * @param count - Number of tasks to create
   * @param baseData - Base data to apply to all tasks
   * @returns Promise resolving to an array of created task data
   *
   * @example
   * ```typescript
   * const tasks = await dbHelper.createMultipleTestTasks(5, {
   *   status: 'new',
   *   url: 'https://example.com'
   * });
   * ```
   */
  async createMultipleTestTasks(
    count: number,
    baseData: Partial<TestTaskData> = {}
  ): Promise<TestTaskData[]> {
    const tasks: TestTaskData[] = [];

    for (let i = 0; i < count; i++) {
      const taskData = {
        ...baseData,
        id: `${this.testPrefix}${uuidv4()}`,
        url: baseData.url || `https://example${i}.com`,
        metadata: { ...baseData.metadata, batchIndex: i },
      };

      const task = await this.createTestTask(taskData);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Tests database connection and basic operations
   *
   * @returns Promise resolving to true if connection is successful, false otherwise
   *
   * @example
   * ```typescript
   * const isConnected = await dbHelper.testConnection();
   * if (!isConnected) {
   *   throw new Error('Database connection failed');
   * }
   * ```
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1 as test');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Tests stored procedure calls
   *
   * Tests the availability and functionality of key stored procedures
   * used by the application. This method helps verify that the database
   * schema is properly set up.
   *
   * @returns Promise resolving to an object with test results for each procedure
   *
   * @example
   * ```typescript
   * const results = await dbHelper.testStoredProcedures();
   * console.log('Stored procedures working:', results);
   * ```
   */
  async testStoredProcedures(): Promise<{
    createWebCrawlTask: boolean;
    findWebCrawlTaskById: boolean;
    countWebCrawlTasksByStatus: boolean;
  }> {
    const results = {
      createWebCrawlTask: false,
      findWebCrawlTaskById: false,
      countWebCrawlTasksByStatus: false,
    };

    try {
      // Test createWebCrawlTask
      const taskId = uuidv4();
      await this.pool.query('CALL createWebCrawlTask($1, $2, $3, $4)', [
        taskId,
        'new',
        'https://test.com',
        JSON.stringify({ test: true }),
      ]);
      results.createWebCrawlTask = true;

      // Test findWebCrawlTaskById
      const findResult = await this.pool.query(
        'SELECT * FROM find_web_crawl_task_by_id($1)',
        [taskId]
      );
      results.findWebCrawlTaskById = findResult.rows.length > 0;

      // Test countWebCrawlTasksByStatus
      const countResult = await this.pool.query(
        'SELECT * FROM count_web_crawl_tasks_by_status($1)',
        ['new']
      );
      results.countWebCrawlTasksByStatus = countResult.rows.length > 0;

      // Clean up test data
      await this.deleteTask(taskId);
    } catch (error) {
      // If any test fails, the corresponding result remains false
    }

    return results;
  }

  /**
   * Gets database schema information
   *
   * Retrieves comprehensive information about the database schema
   * including tables, columns, and enums. This is useful for
   * schema validation and debugging.
   *
   * @returns Promise resolving to schema information object
   *
   * @example
   * ```typescript
   * const schemaInfo = await dbHelper.getSchemaInfo();
   * console.log('Tables:', schemaInfo.tables);
   * console.log('Columns:', schemaInfo.columns);
   * ```
   */
  async getSchemaInfo(): Promise<{
    tables: string[];
    columns: Record<string, any[]>;
    enums: Record<string, string[]>;
  }> {
    const schemaInfo = {
      tables: [] as string[],
      columns: {} as Record<string, any[]>,
      enums: {} as Record<string, string[]>,
    };

    // Get tables
    const tablesResult = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    schemaInfo.tables = tablesResult.rows.map((row) => row.table_name);

    // Get columns for each table
    for (const tableName of schemaInfo.tables) {
      const columnsResult = await this.pool.query(
        `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );
      schemaInfo.columns[tableName] = columnsResult.rows;
    }

    // Get enums
    const enumsResult = await this.pool.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);

    for (const row of enumsResult.rows) {
      if (!schemaInfo.enums[row.typname]) {
        schemaInfo.enums[row.typname] = [];
      }
      schemaInfo.enums[row.typname].push(row.enumlabel);
    }

    return schemaInfo;
  }

  /**
   * Verifies enum values match expected values
   *
   * Validates that the task_status enum in the database contains
   * the expected values. This is useful for ensuring database
   * schema consistency.
   *
   * @returns Promise resolving to validation results
   *
   * @example
   * ```typescript
   * const enumValidation = await dbHelper.verifyEnumValues();
   * if (!enumValidation.task_status) {
   *   console.log('Enum values mismatch:', enumValidation);
   * }
   * ```
   */
  async verifyEnumValues(): Promise<{
    task_status: boolean;
    expectedValues: string[];
    actualValues: string[];
  }> {
    const expectedValues = ['new', 'completed', 'error'];

    const result = await this.pool.query(`
      SELECT unnest(enum_range(NULL::task_status)) as enum_value
    `);

    const actualValues = result.rows.map((row) => row.enum_value);
    const matches =
      JSON.stringify(expectedValues.sort()) ===
      JSON.stringify(actualValues.sort());

    return {
      task_status: matches,
      expectedValues,
      actualValues,
    };
  }
}

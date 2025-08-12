# Job 4: Infrastructure Layer Documentation

## Overview

Document the infrastructure layer components that handle external system interactions, including database adapters, factories, and ports for the task-manager service.

## Files to Document

### 1. `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts` - PostgreSQL Repository Adapter

**Priority**: Critical
**Lines**: 417
**Complexity**: High

**Documentation Requirements**:

- [ ] Adapter purpose and database implementation
- [ ] Constructor and connection pool management
- [ ] CRUD operations with stored procedures
- [ ] Query methods and result mapping
- [ ] Error handling and categorization
- [ ] Parameter sanitization and security
- [ ] Database-specific optimizations
- [ ] Transaction handling (if any)

**Key Methods to Document**:

- `constructor()` - Adapter initialization
- `createWebCrawlTask()` - Task creation with stored procedure
- `updateWebCrawlTask()` - Task update with stored procedure
- `findWebCrawlTaskById()` - Task retrieval by ID
- `findWebCrawlTasksByStatus()` - Status-based queries
- `findWebCrawlTasksByUserEmail()` - User-based queries
- `findAllWebCrawlTasks()` - Complete task retrieval
- `countWebCrawlTasksByStatus()` - Status-based counting
- `countAllWebCrawlTasks()` - Total task counting
- `mapRowToWebCrawlTask()` - Database row mapping
- `logDatabaseError()` - Error logging and categorization
- `categorizeDatabaseError()` - Error classification
- `getDatabaseErrorSeverity()` - Error severity assessment
- `sanitizeParams()` - Parameter sanitization

### 2. `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts` - Metrics Data Adapter

**Priority**: Medium
**Lines**: 52
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Adapter purpose and metrics data access
- [ ] Constructor and connection management
- [ ] Metrics aggregation methods
- [ ] Time range handling
- [ ] Query optimization for metrics

**Key Methods to Document**:

- `constructor()` - Adapter initialization
- `getWebCrawlMetrics()` - Complete metrics retrieval
- `getNewTasksCount()` - New tasks count
- `getCompletedTasksCount()` - Completed tasks count
- `getErrorTasksCount()` - Error tasks count

### 3. `src/infrastructure/persistence/postgres/postgres.factory.ts` - Database Connection Factory

**Priority**: High
**Lines**: 210
**Complexity**: High

**Documentation Requirements**:

- [ ] Factory purpose and connection management
- [ ] Constructor and configuration handling
- [ ] Connection pool initialization
- [ ] Adapter creation methods
- [ ] Health check and monitoring
- [ ] Graceful shutdown procedures
- [ ] Connection error handling

**Key Methods to Document**:

- `constructor()` - Factory initialization
- `waitForInitialization()` - Connection pool setup
- `getPool()` - Pool access method
- `createWebCrawlMetricsAdapter()` - Metrics adapter factory
- `close()` - Graceful shutdown
- `checkHealth()` - Health monitoring

### 4. `src/infrastructure/ports/web-crawl-task-repository.port.ts` - Repository Operations Contract

**Priority**: Critical
**Lines**: 80
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Port purpose and persistence contract
- [ ] Method signatures and data contracts
- [ ] Parameter validation requirements
- [ ] Return value specifications
- [ ] Error handling expectations
- [ ] Performance considerations

**Key Methods to Document**:

- `createWebCrawlTask()` - Task creation contract
- `updateWebCrawlTask()` - Task update contract
- `findWebCrawlTaskById()` - Task retrieval contract
- `findWebCrawlTasksByStatus()` - Status-based query contract
- `findWebCrawlTasksByUserEmail()` - User-based query contract
- `findAllWebCrawlTasks()` - Complete retrieval contract
- `countWebCrawlTasksByStatus()` - Status-based counting contract
- `countAllWebCrawlTasks()` - Total counting contract

## Documentation Standards

### Repository Adapter Documentation Template

````typescript
/**
 * WebCrawlTaskRepositoryAdapter
 *
 * PostgreSQL implementation of the web crawl task repository port.
 * Handles all database operations for web crawl task entities using
 * stored procedures and optimized queries.
 *
 * Responsibilities:
 * - Execute CRUD operations using stored procedures
 * - Map database rows to domain entities
 * - Handle database errors and categorization
 * - Sanitize parameters for security
 * - Optimize queries for performance
 *
 * Database Schema:
 * - Uses stored procedures for all operations
 * - Implements proper error handling and logging
 * - Supports parameterized queries for security
 *
 * @example
 * ```typescript
 * const pool = new Pool(postgresConfig);
 * const repository = new WebCrawlTaskRepositoryAdapter(pool);
 *
 * // Create a new task
 * const task = WebCrawlTask.create('id', 'user@example.com', 'query', 'url', new Date());
 * const createdTask = await repository.createWebCrawlTask(task);
 *
 * // Find task by ID
 * const foundTask = await repository.findWebCrawlTaskById('task-id');
 * ```
 */
export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  /**
   * Initialize the repository adapter with database connection pool
   *
   * @param pool - PostgreSQL connection pool for database operations
   */
  constructor(private readonly pool: Pool) {}
}
````

### Factory Documentation Template

````typescript
/**
 * PostgresFactory
 *
 * Factory class for managing PostgreSQL connections and creating database adapters.
 * Handles connection pool initialization, health monitoring, and graceful shutdown.
 *
 * Responsibilities:
 * - Initialize and manage connection pools
 * - Create database adapters with proper connections
 * - Monitor database health and connectivity
 * - Handle graceful shutdown and cleanup
 * - Provide connection configuration management
 *
 * @example
 * ```typescript
 * const factory = new PostgresFactory(postgresConfig);
 * await factory.waitForInitialization();
 *
 * const pool = factory.getPool();
 * const repository = new WebCrawlTaskRepositoryAdapter(pool);
 *
 * // Cleanup
 * await factory.close();
 * ```
 */
export class PostgresFactory {
  /**
   * Initialize the factory with PostgreSQL configuration
   *
   * @param config - PostgreSQL connection and pool configuration
   */
  constructor(private readonly config: PostgresConfigType) {}
}
````

### Port Documentation Template

````typescript
/**
 * IWebCrawlTaskRepositoryPort
 *
 * Defines the contract for web crawl task persistence operations.
 * This interface is implemented by concrete repository adapters and used
 * by the application layer for database operations.
 *
 * Persistence Contract:
 * - All methods must handle database errors gracefully
 * - Return values must be domain entities or null for not found
 * - Parameter validation must be performed
 * - Logging must track database operations
 * - Performance considerations must be addressed
 *
 * @example
 * ```typescript
 * class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
 *   async createWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask> {
 *     // Implementation using stored procedures
 *   }
 * }
 * ```
 */
export interface IWebCrawlTaskRepositoryPort {
  /**
   * Creates a new web crawl task record in the database
   *
   * Persists a domain entity to the database using stored procedures.
   * Handles database errors and provides proper logging for audit trail.
   *
   * @param task - The domain entity to persist
   * @returns The created task entity with database-generated fields
   * @throws Error if the task cannot be created (duplicate ID, constraint violation, etc.)
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.create('id', 'user@example.com', 'query', 'url', new Date());
   * const createdTask = await repository.createWebCrawlTask(task);
   * ```
   */
  createWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask>;
}
````

## Implementation Steps

1. **Review Database Operations**

   - Understand stored procedure usage and optimization
   - Identify error handling and categorization patterns
   - Review parameter sanitization and security measures
   - Analyze query performance and optimization

2. **Document Repository Adapters**

   - Add comprehensive class-level documentation
   - Document constructor and connection management
   - Document all CRUD operations with database context
   - Include error handling and logging patterns
   - Document mapping and transformation logic

3. **Document Factory Classes**

   - Add factory purpose and responsibility documentation
   - Document connection pool management
   - Include health monitoring and shutdown procedures
   - Document adapter creation methods

4. **Document Port Interfaces**

   - Add interface contract documentation
   - Document method signatures with persistence context
   - Include performance and error handling expectations
   - Provide implementation examples

5. **Add Database Context**

   - Explain stored procedure usage and benefits
   - Document error categorization and handling
   - Include security considerations (parameter sanitization)
   - Add performance optimization notes

6. **Review and Refine**
   - Ensure documentation reflects actual database operations
   - Verify examples are accurate and useful
   - Check for consistency with application layer documentation

## Success Criteria

- [ ] All repository adapters have comprehensive documentation with database context
- [ ] All public methods are documented with parameters, returns, and database operations
- [ ] Factory classes have clear connection management documentation
- [ ] Port interfaces have complete persistence contract documentation
- [ ] Documentation includes error handling and security patterns
- [ ] Examples demonstrate proper database usage and optimization

## Estimated Time

**Total**: 2-3 days

- `web-crawl-task.repository.adapter.ts`: 8-10 hours
- `WebCrawlMetricsAdapter.ts`: 2-3 hours
- `postgres.factory.ts`: 3-4 hours
- `web-crawl-task-repository.port.ts`: 2-3 hours
- Review and refinement: 3-4 hours

## Dependencies

- Job 1 (Core Application Documentation) - for understanding application context
- Job 2 (Domain Layer Documentation) - for understanding domain entities
- Job 3 (Application Layer Documentation) - for understanding service dependencies

## Notes

- Focus on database operations and persistence patterns rather than business logic
- Emphasize stored procedure usage and query optimization
- Include security considerations (parameter sanitization, SQL injection prevention)
- Document error handling and categorization patterns
- Consider adding database schema diagrams if helpful
- Ensure documentation aligns with PostgreSQL best practices

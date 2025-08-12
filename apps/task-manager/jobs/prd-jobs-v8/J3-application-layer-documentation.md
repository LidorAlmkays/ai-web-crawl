# Job 3: Application Layer Documentation

## Overview

Document the application layer components that contain the business logic services, ports, and factories for the task-manager service.

## Files to Document

### 1. `src/application/services/web-crawl-task-manager.service.ts` - Main Business Logic Service

**Priority**: Critical
**Lines**: 203
**Complexity**: High

**Documentation Requirements**:

- [ ] Service purpose and business responsibilities
- [ ] Constructor and dependency injection
- [ ] Task creation and management methods
- [ ] Task retrieval and querying methods
- [ ] Task status update methods
- [ ] Statistics and reporting methods
- [ ] Error handling and logging patterns
- [ ] Business logic validation

**Key Methods to Document**:

- `constructor()` - Service initialization
- `createWebCrawlTask()` - Task creation business logic
- `getWebCrawlTaskById()` - Task retrieval by ID
- `getWebCrawlTasksByUserEmail()` - User-specific task queries
- `getWebCrawlTasksByStatus()` - Status-based task queries
- `getAllWebCrawlTasks()` - Complete task retrieval
- `updateWebCrawlTaskStatus()` - Status update business logic
- `getWebCrawlTaskStatistics()` - Statistics aggregation

### 2. `src/application/services/application.factory.ts` - Service Factory

**Priority**: High
**Lines**: 41
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Factory purpose and dependency injection pattern
- [ ] Service creation methods
- [ ] Dependency wiring logic
- [ ] Factory configuration options

**Key Methods to Document**:

- `createWebCrawlTaskManager()` - Main service factory method
- `createWebCrawlMetricsService()` - Metrics service factory method

### 3. `src/application/services/WebCrawlMetricsService.ts` - Metrics Service

**Priority**: Medium
**Lines**: 68
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Service purpose and metrics aggregation
- [ ] Time range handling and configuration
- [ ] Prometheus format generation
- [ ] Individual metric retrieval methods
- [ ] Configuration access methods

**Key Methods to Document**:

- `constructor()` - Service initialization
- `getMetrics()` - Main metrics retrieval
- `getPrometheusFormat()` - Prometheus format generation
- `getNewTasksCount()` - New tasks count retrieval
- `getCompletedTasksCount()` - Completed tasks count retrieval
- `getErrorTasksCount()` - Error tasks count retrieval
- `getAvailableTimeRanges()` - Configuration access
- `getDefaultTimeRange()` - Default configuration access
- `getRefreshInterval()` - Refresh configuration access

### 4. `src/application/ports/web-crawl-task-manager.port.ts` - Business Operations Contract

**Priority**: Critical
**Lines**: 89
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Port purpose and contract definition
- [ ] Method signatures and business contracts
- [ ] Parameter validation requirements
- [ ] Return value specifications
- [ ] Error handling expectations

**Key Methods to Document**:

- `createWebCrawlTask()` - Task creation contract
- `updateWebCrawlTaskStatus()` - Status update contract
- `getWebCrawlTaskById()` - Task retrieval contract
- `getWebCrawlTasksByStatus()` - Status-based query contract
- `getWebCrawlTasksByUserEmail()` - User-based query contract
- `getAllWebCrawlTasks()` - Complete retrieval contract
- `getWebCrawlTaskStatistics()` - Statistics contract

### 5. `src/application/ports/IWebCrawlMetricsDataPort.ts` - Metrics Data Contract

**Priority**: Medium
**Lines**: 9
**Complexity**: Low

**Documentation Requirements**:

- [ ] Port purpose and data access contract
- [ ] Method signatures for metrics retrieval
- [ ] Time range parameter handling
- [ ] Return value specifications

**Key Methods to Document**:

- `getWebCrawlMetrics()` - Complete metrics retrieval
- `getNewTasksCount()` - New tasks count
- `getCompletedTasksCount()` - Completed tasks count
- `getErrorTasksCount()` - Error tasks count

## Documentation Standards

### Service Documentation Template

````typescript
/**
 * WebCrawlTaskManagerService
 *
 * Application service that implements business logic for web crawl task management.
 * Coordinates between domain entities and infrastructure layer, handling all business
 * operations related to task lifecycle management.
 *
 * Responsibilities:
 * - Task creation and validation
 * - Task status management and transitions
 * - Task querying and filtering
 * - Statistics aggregation and reporting
 * - Business rule enforcement
 *
 * Dependencies:
 * - IWebCrawlTaskRepositoryPort for data persistence
 * - Logger for operation tracking
 *
 * @example
 * ```typescript
 * const repository = new WebCrawlTaskRepositoryAdapter(pool);
 * const service = new WebCrawlTaskManagerService(repository);
 *
 * // Create a new task
 * const task = await service.createWebCrawlTask(
 *   'task-id',
 *   'user@example.com',
 *   'Search query',
 *   'https://example.com'
 * );
 *
 * // Update task status
 * await service.updateWebCrawlTaskStatus(
 *   'task-id',
 *   TaskStatus.COMPLETED,
 *   'Results found'
 * );
 * ```
 */
export class WebCrawlTaskManagerService implements IWebCrawlTaskManagerPort {
  /**
   * Initialize the service with required dependencies
   *
   * @param webCrawlTaskRepository - Repository for task persistence operations
   */
  constructor(private readonly webCrawlTaskRepository: IWebCrawlTaskRepositoryPort) {}
}
````

### Factory Documentation Template

````typescript
/**
 * ApplicationFactory
 *
 * Factory class for creating and configuring application services with proper
 * dependency injection. Centralizes service creation logic and ensures consistent
 * dependency wiring across the application.
 *
 * Responsibilities:
 * - Create service instances with proper dependencies
 * - Wire up infrastructure adapters to application services
 * - Ensure consistent service configuration
 * - Manage dependency injection patterns
 *
 * @example
 * ```typescript
 * const repository = new WebCrawlTaskRepositoryAdapter(pool);
 * const taskManager = ApplicationFactory.createWebCrawlTaskManager(repository);
 *
 * const metricsAdapter = new WebCrawlMetricsAdapter(pool);
 * const metricsService = ApplicationFactory.createWebCrawlMetricsService(metricsAdapter);
 * ```
 */
export class ApplicationFactory {
  /**
   * Create a WebCrawlTaskManager service with repository dependency
   *
   * Factory method that creates and configures the main task management service
   * with proper dependency injection and logging setup.
   *
   * @param webCrawlTaskRepository - Repository adapter for task persistence
   * @returns Configured WebCrawlTaskManagerService instance
   *
   * @example
   * ```typescript
   * const repository = new WebCrawlTaskRepositoryAdapter(pool);
   * const service = ApplicationFactory.createWebCrawlTaskManager(repository);
   * ```
   */
  static createWebCrawlTaskManager(webCrawlTaskRepository: IWebCrawlTaskRepositoryPort): WebCrawlTaskManagerService {}
}
````

### Port Documentation Template

````typescript
/**
 * IWebCrawlTaskManagerPort
 *
 * Defines the contract for web crawl task business operations.
 * This interface is implemented by concrete service classes and used by the API
 * layer for business logic operations.
 *
 * Business Contract:
 * - All methods must handle business validation
 * - Error handling must provide meaningful business context
 * - Logging must track business operations
 * - Return values must be domain entities or business DTOs
 *
 * @example
 * ```typescript
 * class WebCrawlTaskManagerService implements IWebCrawlTaskManagerPort {
 *   async createWebCrawlTask(taskId: string, userEmail: string, ...): Promise<WebCrawlTask> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IWebCrawlTaskManagerPort {
  /**
   * Creates a new web crawl task and persists it to the database
   *
   * Handles the business logic of task creation including validation,
   * domain entity creation, and persistence. Ensures proper audit trail
   * and business rule compliance.
   *
   * @param taskId - The task ID from the Kafka message header
   * @param userEmail - Email of the user requesting the task
   * @param userQuery - Query or description of what the task should do
   * @param originalUrl - Original URL associated with the task
   * @returns The created task entity with proper business state
   * @throws Error if task creation fails (validation, persistence, etc.)
   *
   * @example
   * ```typescript
   * const task = await service.createWebCrawlTask(
   *   'task-123',
   *   'user@example.com',
   *   'Find product information',
   *   'https://store.example.com'
   * );
   * ```
   */
  createWebCrawlTask(taskId: string, userEmail: string, userQuery: string, originalUrl: string): Promise<WebCrawlTask>;
}
````

## Implementation Steps

1. **Review Business Logic**

   - Understand service responsibilities and business rules
   - Identify validation and error handling patterns
   - Review dependency injection and factory patterns

2. **Document Service Classes**

   - Add comprehensive class-level documentation
   - Document constructor and dependencies
   - Document all public methods with business context
   - Include error handling and logging patterns

3. **Document Factory Classes**

   - Add factory purpose and responsibility documentation
   - Document factory methods with dependency wiring
   - Include configuration and setup examples

4. **Document Port Interfaces**

   - Add interface contract documentation
   - Document method signatures with business context
   - Include validation and error handling expectations
   - Provide implementation examples

5. **Add Business Context**

   - Explain business rules and validation logic
   - Document error handling patterns
   - Include logging and monitoring considerations
   - Add performance and scalability notes

6. **Review and Refine**
   - Ensure documentation reflects actual business logic
   - Verify examples are accurate and useful
   - Check for consistency with domain layer documentation

## Success Criteria

- [ ] All service classes have comprehensive documentation with business context
- [ ] All public methods are documented with parameters, returns, and business logic
- [ ] Factory classes have clear dependency injection documentation
- [ ] Port interfaces have complete contract documentation
- [ ] Documentation includes error handling and validation patterns
- [ ] Examples demonstrate proper service usage and configuration

## Estimated Time

**Total**: 2-3 days

- `web-crawl-task-manager.service.ts`: 6-8 hours
- `application.factory.ts`: 2-3 hours
- `WebCrawlMetricsService.ts`: 3-4 hours
- `web-crawl-task-manager.port.ts`: 2-3 hours
- `IWebCrawlMetricsDataPort.ts`: 1 hour
- Review and refinement: 3-4 hours

## Dependencies

- Job 1 (Core Application Documentation) - for understanding application context
- Job 2 (Domain Layer Documentation) - for understanding domain entities and types

## Notes

- Focus on business logic and service responsibilities rather than technical implementation
- Emphasize dependency injection patterns and factory usage
- Include validation rules and business constraints
- Document error handling patterns and logging strategies
- Consider adding service interaction diagrams if helpful
- Ensure documentation aligns with clean architecture principles

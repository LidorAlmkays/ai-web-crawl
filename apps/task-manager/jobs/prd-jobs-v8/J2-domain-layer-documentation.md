# Job 2: Domain Layer Documentation

## Overview

Document the domain layer components that contain the core business entities, types, and enums for the task-manager service.

## Files to Document

### 1. `src/domain/entities/web-crawl-task.entity.ts` - Core Business Entity

**Priority**: Critical
**Lines**: 145
**Complexity**: High

**Documentation Requirements**:

- [ ] Entity purpose and business rules
- [ ] Constructor parameters and validation
- [ ] Static factory methods (`create`, `createCompleted`)
- [ ] Instance methods for state transitions
- [ ] Business logic methods (`isCompleted`, `isInProgress`, etc.)
- [ ] Duration calculation logic
- [ ] Date handling and validation

**Key Methods to Document**:

- `constructor()` - Entity initialization
- `static create()` - Factory method for new tasks
- `static createCompleted()` - Factory method for completed tasks
- `markAsStarted()` - State transition to started
- `markAsCompleted()` - State transition to completed
- `markAsError()` - State transition to error
- `isCompleted()` - Business logic check
- `isInProgress()` - Business logic check
- `isSuccessful()` - Business logic check
- `hasError()` - Business logic check
- `getDuration()` - Duration calculation

### 2. `src/domain/types/metrics.types.ts` - Metrics Type Definitions

**Priority**: Medium
**Lines**: 13
**Complexity**: Low

**Documentation Requirements**:

- [ ] Interface purpose and usage
- [ ] Field descriptions and constraints
- [ ] Relationship to business metrics
- [ ] Usage examples

**Interfaces to Document**:

- `WebCrawlMetrics` - Metrics data structure
- `MetricsQueryParams` - Query parameters for metrics

### 3. `src/common/enums/task-status.enum.ts` - Task Status Values

**Priority**: High
**Lines**: 10
**Complexity**: Low

**Documentation Requirements**:

- [ ] Enum purpose and business meaning
- [ ] Database alignment explanation
- [ ] State transition rules
- [ ] Usage in business logic

**Values to Document**:

- `NEW` - Initial task state
- `COMPLETED` - Successful completion state
- `ERROR` - Error/failure state

### 4. `src/common/enums/task-type.enum.ts` - Task Type Classification

**Priority**: Medium
**Lines**: 7
**Complexity**: Low

**Documentation Requirements**:

- [ ] Enum purpose and extensibility
- [ ] Current task types
- [ ] Future expansion considerations

**Values to Document**:

- `WEB_CRAWL` - Web crawling task type

## Documentation Standards

### Entity Documentation Template

````typescript
/**
 * WebCrawlTask
 *
 * Core business entity representing a web crawling task in the system.
 * Contains business logic for task lifecycle management and state transitions.
 *
 * Business Rules:
 * - Tasks start in NEW status
 * - Tasks can transition to COMPLETED or ERROR
 * - Duration is calculated only for completed tasks
 * - All timestamps are required for audit trail
 *
 * @example
 * ```typescript
 * // Create a new task
 * const task = WebCrawlTask.create(
 *   'task-id',
 *   'user@example.com',
 *   'Search query',
 *   'https://example.com',
 *   new Date()
 * );
 *
 * // Mark as completed
 * task.markAsCompleted('Results found');
 *
 * // Check status
 * if (task.isCompleted()) {
 *   console.log(`Duration: ${task.getDuration()}ms`);
 * }
 * ```
 */
export class WebCrawlTask {
  /**
   * Create a new web crawl task with initial state
   *
   * Factory method that creates a task in NEW status with proper timestamps.
   * Validates required parameters and sets up audit trail.
   *
   * @param id - Unique task identifier
   * @param userEmail - Email of the requesting user
   * @param userQuery - Search query or task description
   * @param originalUrl - Original URL for the task
   * @param receivedAt - Timestamp when task was received
   * @returns New WebCrawlTask instance in NEW status
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.create(
   *   uuidv4(),
   *   'user@example.com',
   *   'Find product information',
   *   'https://store.example.com',
   *   new Date()
   * );
   * ```
   */
  static create(id: string, userEmail: string, userQuery: string, originalUrl: string, receivedAt: Date): WebCrawlTask {}
}
````

### Interface Documentation Template

````typescript
/**
 * WebCrawlMetrics
 *
 * Data structure for web crawling task metrics and statistics.
 * Used for monitoring and reporting task performance over time.
 *
 * @example
 * ```typescript
 * const metrics: WebCrawlMetrics = {
 *   newTasksCount: 10,
 *   completedTasksCount: 8,
 *   errorTasksCount: 2,
 *   timeRange: '24h',
 *   timestamp: '2024-01-01T00:00:00Z',
 *   lastUpdated: '2024-01-01T12:00:00Z'
 * };
 * ```
 */
export interface WebCrawlMetrics {
  /**
   * Number of tasks in NEW status within the time range
   */
  newTasksCount: number;

  /**
   * Number of tasks in COMPLETED status within the time range
   */
  completedTasksCount: number;

  /**
   * Number of tasks in ERROR status within the time range
   */
  errorTasksCount: number;

  /**
   * Time range for the metrics (e.g., '1h', '24h', '7d')
   */
  timeRange: string;

  /**
   * ISO timestamp when metrics were calculated
   */
  timestamp: string;

  /**
   * ISO timestamp when metrics were last updated
   */
  lastUpdated: string;
}
````

### Enum Documentation Template

````typescript
/**
 * TaskStatus
 *
 * Enumeration of possible task statuses in the system.
 * Values align with database enum to ensure consistency.
 *
 * State Transitions:
 * - NEW: Initial state, can transition to COMPLETED or ERROR
 * - COMPLETED: Final state, task completed successfully
 * - ERROR: Final state, task failed with error
 *
 * @example
 * ```typescript
 * const status = TaskStatus.NEW;
 *
 * // Check if task is in progress
 * if (status === TaskStatus.NEW) {
 *   console.log('Task is being processed');
 * }
 * ```
 */
export enum TaskStatus {
  /**
   * Task is new and waiting to be processed
   * This is the initial state for all tasks
   */
  NEW = 'new',

  /**
   * Task completed successfully
   * This is a final state
   */
  COMPLETED = 'completed',

  /**
   * Task failed with an error
   * This is a final state
   */
  ERROR = 'error',
}
````

## Implementation Steps

1. **Review Entity Business Logic**

   - Understand task lifecycle and state transitions
   - Identify business rules and constraints
   - Review date handling and validation logic

2. **Document Entity Class**

   - Add comprehensive class-level documentation
   - Document constructor and all properties
   - Document static factory methods
   - Document instance methods with business logic

3. **Document Type Interfaces**

   - Add interface documentation with field descriptions
   - Include usage examples
   - Explain business context

4. **Document Enums**

   - Add enum documentation with value meanings
   - Explain state transition rules
   - Include usage examples

5. **Add Business Context**

   - Explain how entities relate to business processes
   - Document validation rules and constraints
   - Include error handling considerations

6. **Review and Refine**
   - Ensure documentation reflects actual business logic
   - Verify examples are accurate and useful
   - Check for consistency with domain terminology

## Success Criteria

- [ ] Entity class has comprehensive documentation with business rules
- [ ] All methods are documented with parameters, returns, and business logic
- [ ] Type interfaces have clear field descriptions and usage examples
- [ ] Enums have value explanations and state transition rules
- [ ] Documentation includes practical business context
- [ ] Examples demonstrate proper usage patterns

## Estimated Time

**Total**: 1-2 days

- `web-crawl-task.entity.ts`: 4-6 hours
- `metrics.types.ts`: 1-2 hours
- `task-status.enum.ts`: 1 hour
- `task-type.enum.ts`: 30 minutes
- Review and refinement: 2-3 hours

## Dependencies

- Job 1 (Core Application Documentation) - for understanding application context

## Notes

- Focus on business logic and domain rules rather than technical implementation
- Emphasize state transitions and lifecycle management
- Include validation rules and business constraints
- Consider adding state transition diagrams if helpful
- Ensure documentation aligns with database schema and business requirements

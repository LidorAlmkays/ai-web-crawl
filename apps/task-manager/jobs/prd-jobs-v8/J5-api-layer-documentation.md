# Job 5: API Layer Documentation

## Overview

Document the API layer components that handle external communication, including Kafka consumers, REST endpoints, DTOs, and message handlers for the task-manager service.

## Files to Document

### 1. `src/api/kafka/kafka-api.manager.ts` - Kafka Consumer Lifecycle Management

**Priority**: Critical
**Lines**: 153
**Complexity**: High

**Documentation Requirements**:

- [ ] Manager purpose and consumer lifecycle
- [ ] Constructor and dependency injection
- [ ] Consumer registration and startup
- [ ] Pause/resume/stop operations
- [ ] Error handling and recovery
- [ ] Consumer state management
- [ ] Topic management and configuration

**Key Methods to Document**:

- `constructor()` - Manager initialization
- `start()` - Consumer startup sequence
- `pause()` - Consumer pause operations
- `resume()` - Consumer resume operations
- `stop()` - Consumer shutdown
- `getRegistrationsCount()` - Registration tracking
- `getRegisteredTopics()` - Topic listing
- `isConsuming()` - Consumption state check

### 2. `src/api/kafka/kafka.router.ts` - Consumer Registration and Routing

**Priority**: High
**Lines**: 50
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Router purpose and registration pattern
- [ ] Consumer registration logic
- [ ] Handler wiring and dependency injection
- [ ] Topic configuration management
- [ ] Registration validation

**Key Functions to Document**:

- `registerConsumers()` - Consumer registration
- `ConsumerRegistration` type - Registration structure

### 3. `src/api/kafka/consumers/base-consumer.ts` - Abstract Consumer Implementation

**Priority**: High
**Lines**: 72
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Abstract class purpose and lifecycle
- [ ] Consumer state management
- [ ] Pause/resume/stop operations
- [ ] Topic subscription handling
- [ ] Error handling patterns

**Key Methods to Document**:

- `constructor()` - Consumer initialization
- `start()` - Abstract start method
- `pause()` - Consumer pause
- `resume()` - Consumer resume
- `stop()` - Consumer stop
- `isConsuming()` - State check

### 4. `src/api/kafka/consumers/task-status.consumer.ts` - Task Status Consumer

**Priority**: High
**Lines**: 26
**Complexity**: Low

**Documentation Requirements**:

- [ ] Consumer purpose and topic handling
- [ ] Message processing logic
- [ ] Error handling and recovery
- [ ] Business logic integration

**Key Methods to Document**:

- `start()` - Consumer startup implementation

### 5. `src/api/kafka/consumers/consumer.interface.ts` - Consumer Contract

**Priority**: Medium
**Lines**: 27
**Complexity**: Low

**Documentation Requirements**:

- [ ] Interface purpose and contract
- [ ] Method signatures and lifecycle
- [ ] State management requirements
- [ ] Error handling expectations

**Key Methods to Document**:

- `start()` - Consumer start contract
- `pause()` - Consumer pause contract
- `resume()` - Consumer resume contract
- `stop()` - Consumer stop contract
- `isConsuming()` - State check contract

### 6. `src/api/kafka/handlers/base-handler.interface.ts` - Message Handler Contract

**Priority**: Medium
**Lines**: 10
**Complexity**: Low

**Documentation Requirements**:

- [ ] Interface purpose and message handling
- [ ] Message processing contract
- [ ] Error handling expectations
- [ ] Business logic integration

**Key Methods to Document**:

- `handle()` - Message handling contract

### 7. `src/api/kafka/handlers/task-status.handler.ts` - Task Status Message Handler

**Priority**: High
**Lines**: 100+
**Complexity**: High

**Documentation Requirements**:

- [ ] Handler purpose and message processing
- [ ] DTO validation and transformation
- [ ] Business logic integration
- [ ] Error handling and recovery
- [ ] Logging and monitoring

**Key Methods to Document**:

- `handle()` - Message processing implementation
- `validateMessage()` - Message validation
- `processTaskStatus()` - Business logic processing
- `handleError()` - Error handling

### 8. `src/api/rest/rest.router.ts` - Main REST Router

**Priority**: High
**Lines**: 168
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Router purpose and endpoint organization
- [ ] Middleware configuration
- [ ] Route registration and handling
- [ ] Error handling and validation
- [ ] Health check integration

**Key Functions to Document**:

- `createRestRouter()` - Router creation
- Route registration logic
- Middleware setup

### 9. `src/api/rest/health-check.router.ts` - Health Monitoring Endpoints

**Priority**: Medium
**Lines**: 272
**Complexity**: Medium

**Documentation Requirements**:

- [ ] Health check purpose and monitoring
- [ ] Endpoint organization and hierarchy
- [ ] Component health checking
- [ ] Kubernetes integration (liveness/readiness)
- [ ] Error handling and status codes

**Key Endpoints to Document**:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information
- `GET /health/database` - Database health check
- `GET /health/kafka` - Kafka health check
- `GET /health/service` - Service health check
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### 10. DTOs Documentation

**Priority**: High
**Files**: Multiple DTO files in `src/api/kafka/dtos/`
**Complexity**: Low-Medium

**Documentation Requirements**:

- [ ] DTO purpose and validation rules
- [ ] Field descriptions and constraints
- [ ] Validation decorators and rules
- [ ] Usage examples and patterns
- [ ] Error message customization

**DTOs to Document**:

- `TaskStatusDto` - Generic task status validation
- `NewTaskStatusMessageDto` - New task message validation
- `CompletedTaskStatusMessageDto` - Completed task message validation
- `ErrorTaskStatusMessageDto` - Error task message validation
- `TaskStatusHeaderDto` - Message header validation

## Documentation Standards

### API Manager Documentation Template

````typescript
/**
 * KafkaApiManager
 *
 * Manages lifecycle of Kafka consumers using a single KafkaClient instance.
 * Handles consumer registration, startup, pause/resume, and graceful shutdown.
 *
 * Responsibilities:
 * - Register consumers with their handlers
 * - Manage consumer lifecycle (start/pause/resume/stop)
 * - Handle consumer state tracking
 * - Provide consumer health monitoring
 * - Coordinate topic management
 *
 * @example
 * ```typescript
 * const kafkaClient = new KafkaClient();
 * const deps = { webCrawlTaskManager };
 * const manager = new KafkaApiManager(kafkaClient, deps);
 *
 * await manager.start(); // Start all consumers
 * await manager.pause();  // Pause all consumers
 * await manager.resume(); // Resume all consumers
 * await manager.stop();   // Stop all consumers
 * ```
 */
export class KafkaApiManager {
  /**
   * Initialize the API manager with Kafka client and dependencies
   *
   * @param kafkaClient - Kafka client for consumer operations
   * @param deps - Dependencies for consumer handlers
   */
  constructor(private readonly kafkaClient: KafkaClient, private readonly deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }) {}
}
````

### Consumer Documentation Template

````typescript
/**
 * BaseConsumer
 *
 * Abstract base class providing common lifecycle implementation for all Kafka consumers.
 * Handles consumer state management, pause/resume operations, and topic subscription.
 *
 * Responsibilities:
 * - Manage consumer state (consuming/paused/stopped)
 * - Handle topic pause/resume operations
 * - Provide state checking capabilities
 * - Coordinate with Kafka client for operations
 *
 * @example
 * ```typescript
 * class MyConsumer extends BaseConsumer {
 *   constructor() {
 *     super('my-topic');
 *   }
 *
 *   async start(kafkaClient: KafkaClient, handler: IHandler): Promise<void> {
 *     await kafkaClient.subscribe(this.topic, handler.handle.bind(handler));
 *   }
 * }
 * ```
 */
export abstract class BaseConsumer implements IConsumer {
  /**
   * Initialize consumer with topic name
   *
   * @param topic - Kafka topic to consume from
   */
  constructor(public readonly topic: string) {}
}
````

### Handler Documentation Template

````typescript
/**
 * TaskStatusHandler
 *
 * Handles task status messages from Kafka topics.
 * Validates message format, processes business logic, and manages error handling.
 *
 * Responsibilities:
 * - Validate incoming Kafka messages
 * - Transform messages to domain entities
 * - Execute business logic through services
 * - Handle errors and provide recovery
 * - Log operations for monitoring
 *
 * @example
 * ```typescript
 * const handler = new TaskStatusHandler(webCrawlTaskManager);
 * await handler.handle({
 *   topic: 'task-status',
 *   partition: 0,
 *   message: { value: Buffer.from('{"status": "new"}') }
 * });
 * ```
 */
export class TaskStatusHandler implements IHandler {
  /**
   * Initialize handler with business service dependencies
   *
   * @param webCrawlTaskManager - Service for task management operations
   */
  constructor(private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort) {}
}
````

### DTO Documentation Template

````typescript
/**
 * TaskStatusDto
 *
 * Data Transfer Object for validating task status message body.
 * Provides comprehensive validation for task status updates with proper
 * constraint checking and error messages.
 *
 * Validation Rules:
 * - Status must be one of: 'new', 'completed', 'error'
 * - URL must be a valid URL format
 * - Metadata is optional but must be an object if provided
 * - Timestamp is optional but must be ISO format if provided
 *
 * @example
 * ```typescript
 * const dto = new TaskStatusDto();
 * dto.status = 'completed';
 * dto.url = 'https://example.com';
 * dto.metadata = { result: 'success' };
 *
 * const errors = await validate(dto);
 * if (errors.length > 0) {
 *   console.log('Validation failed:', errors);
 * }
 * ```
 */
export class TaskStatusDto {
  /**
   * Task status value
   * Must be one of the predefined enum values
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @IsEnum(['new', 'completed', 'error'])
  status!: string;
}
````

## Implementation Steps

1. **Review API Architecture**

   - Understand Kafka consumer patterns and lifecycle
   - Identify REST endpoint organization and middleware
   - Review DTO validation and transformation patterns
   - Analyze error handling and recovery mechanisms

2. **Document API Managers**

   - Add comprehensive class-level documentation
   - Document lifecycle management methods
   - Include error handling and recovery patterns
   - Document state management and monitoring

3. **Document Consumers and Handlers**

   - Add consumer purpose and topic handling documentation
   - Document message processing and validation logic
   - Include business logic integration patterns
   - Document error handling and recovery strategies

4. **Document REST Endpoints**

   - Add endpoint purpose and organization documentation
   - Document middleware and validation setup
   - Include health check and monitoring patterns
   - Document Kubernetes integration (if applicable)

5. **Document DTOs**

   - Add DTO purpose and validation documentation
   - Document field constraints and validation rules
   - Include usage examples and error handling
   - Document transformation and mapping patterns

6. **Add Integration Context**
   - Explain Kafka consumer patterns and best practices
   - Document REST API design principles
   - Include monitoring and observability considerations
   - Add performance and scalability notes

## Success Criteria

- [ ] All API managers have comprehensive documentation with lifecycle management
- [ ] All consumers and handlers are documented with message processing logic
- [ ] REST endpoints have clear purpose and organization documentation
- [ ] DTOs have complete validation and usage documentation
- [ ] Documentation includes error handling and recovery patterns
- [ ] Examples demonstrate proper API usage and integration

## Estimated Time

**Total**: 2-3 days

- `kafka-api.manager.ts`: 3-4 hours
- `kafka.router.ts`: 1-2 hours
- Consumer files: 2-3 hours
- Handler files: 2-3 hours
- `rest.router.ts`: 2-3 hours
- `health-check.router.ts`: 3-4 hours
- DTOs: 2-3 hours
- Review and refinement: 3-4 hours

## Dependencies

- Job 1 (Core Application Documentation) - for understanding application context
- Job 2 (Domain Layer Documentation) - for understanding domain entities
- Job 3 (Application Layer Documentation) - for understanding service dependencies
- Job 4 (Infrastructure Layer Documentation) - for understanding database operations

## Notes

- Focus on API patterns and integration rather than business logic
- Emphasize Kafka consumer lifecycle and message processing
- Include REST API design principles and best practices
- Document validation and error handling patterns
- Consider adding API interaction diagrams if helpful
- Ensure documentation aligns with messaging and REST best practices

# Architecture Documentation

This document provides comprehensive information about the architectural design, patterns, and decisions used in the Task Manager Service.

## 📋 Overview

The Task Manager Service is built using Clean Architecture principles with a focus on:
- **Separation of Concerns**: Clear boundaries between layers
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Testability**: Easy to test and mock dependencies
- **Scalability**: Horizontal scaling through event-driven architecture
- **Maintainability**: Clear structure and consistent patterns

## 🚀 Server/Application Layer Pattern

### Core Principle: Responsibility Separation

The service follows a **Server/Application separation pattern** that should be adopted across all services in the monorepo:

#### **Server Layer** (`src/server.ts`)
**Responsibility:** Process lifecycle management
- Signal handling (SIGINT, SIGTERM) for graceful shutdown
- OpenTelemetry initialization and shutdown
- Process exit coordination
- Logging process-level events

**NOT responsible for:**
- Business logic
- Dependency injection
- Resource management (databases, message queues)
- Service startup logic

#### **Application Layer** (`src/app.ts`) 
**Responsibility:** Service composition and startup
- Dependency injection and factory management
- Resource lifecycle (databases, message queues, HTTP server)
- Service configuration and wiring
- Infrastructure initialization
- Graceful resource cleanup

**NOT responsible for:**
- Signal handling (handled by server.ts)
- Process lifecycle management
- OpenTelemetry SDK management
- Process exit calls

### Pattern for Other Services

All services should follow this pattern:

1. **Server layer** handles process concerns
2. **Application layer** handles business concerns
3. Use structured logging (logger, not console.log)
4. Proper graceful shutdown sequence
5. Clear separation of responsibilities

This ensures **consistency across the monorepo** and makes services maintainable, testable, and observable.

## 🏗️ Architecture Layers

### Layer Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   REST API      │  │   Kafka API     │  │   Health    │ │
│  │   Controllers   │  │   Consumers     │  │   Checks    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Services      │  │   Use Cases     │  │   Ports     │ │
│  │   (Business     │  │   (Orchestration│  │   (Contracts│ │
│  │    Logic)       │  │    Logic)       │  │    & DTOs)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Entities      │  │   Value Objects │  │   Enums     │ │
│  │   (Core Business│  │   (Business     │  │   (Business │ │
│  │    Objects)     │  │    Rules)       │  │    Types)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Persistence   │  │   Messaging     │  │   External  │ │
│  │   (Database     │  │   (Kafka        │  │   Services  │ │
│  │    Adapters)    │  │    Adapters)    │  │   (APIs)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Clean Architecture Principles

### Dependency Rule
Dependencies point inward. The Domain layer has no dependencies, while the Infrastructure layer depends on the Domain layer.

### Layer Responsibilities

#### Domain Layer (Core)
- **Entities**: Core business objects (WebCrawlTask)
- **Value Objects**: Immutable business concepts
- **Enums**: Business type definitions (TaskStatus)
- **No Dependencies**: Pure business logic

#### Application Layer (Use Cases)
- **Services**: Orchestrate business operations
- **Ports**: Define contracts for external dependencies
- **DTOs**: Data transfer objects for API communication
- **Dependencies**: Only on Domain layer

#### Infrastructure Layer (External)
- **Adapters**: Implement ports for external systems
- **Database**: PostgreSQL adapters and repositories
- **Messaging**: Kafka producers and consumers
- **Dependencies**: On Application and Domain layers

#### API Layer (Interface)
- **Controllers**: Handle HTTP requests
- **Consumers**: Process Kafka messages
- **Routers**: Route requests to appropriate handlers
- **Dependencies**: On Application layer

## 🎯 Domain-Driven Design (DDD)

### Bounded Contexts
The Task Manager Service operates within the **Task Management** bounded context, which includes:
- Task creation and lifecycle management
- Task status tracking and updates
- Task metrics and reporting

### Domain Entities

#### WebCrawlTask Entity
```typescript
export class WebCrawlTask {
  constructor(
    public readonly id: string,
    public readonly userEmail: string,
    public readonly userQuery: string,
    public readonly originalUrl: string,
    public readonly receivedAt: Date,
    public status: TaskStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public result?: string,
    public startedAt?: Date,
    public finishedAt?: Date
  ) {}

  // Business methods
  markAsStarted(): void
  markAsCompleted(result: string): void
  markAsError(errorMessage: string): void
  isCompleted(): boolean
  isInProgress(): boolean
  getDuration(): number | null
}
```

### Value Objects
- **TaskId**: UUID-based task identifier
- **UserEmail**: Email address with validation
- **TaskQuery**: User-provided search query
- **TaskUrl**: Validated URL for crawling

### Domain Events
- **TaskCreated**: Published when a new task is created
- **TaskStarted**: Published when task processing begins
- **TaskCompleted**: Published when task completes successfully
- **TaskFailed**: Published when task fails with error

## 🔌 Ports and Adapters (Hexagonal Architecture)

### Ports (Contracts)

#### Repository Ports
```typescript
export interface IWebCrawlTaskRepositoryPort {
  createWebCrawlTask(
    userEmail: string,
    userQuery: string,
    originalUrl: string,
    receivedAt: Date
  ): Promise<WebCrawlTask>;
  
  findWebCrawlTaskById(taskId: string): Promise<WebCrawlTask | null>;
  findWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]>;
  updateWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask>;
  countWebCrawlTasksByStatus(status: TaskStatus): Promise<number>;
}
```

#### Service Ports
```typescript
export interface IWebCrawlTaskManagerPort {
  createWebCrawlTask(
    userEmail: string,
    userQuery: string,
    originalUrl: string
  ): Promise<WebCrawlTask>;
  
  getWebCrawlTaskById(taskId: string): Promise<WebCrawlTask | null>;
  getWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]>;
  updateWebCrawlTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: string
  ): Promise<WebCrawlTask | null>;
  getWebCrawlTaskStatistics(): Promise<TaskStatistics>;
}
```

### Adapters (Implementations)

#### Database Adapters
```typescript
export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  constructor(private readonly postgresFactory: PostgresFactory) {}
  
  async createWebCrawlTask(...): Promise<WebCrawlTask> {
    // PostgreSQL implementation
  }
}
```

#### Messaging Adapters
```typescript
export class TaskStatusConsumer implements IConsumer {
  constructor(private readonly topic: string) {}
  
  async consume(message: KafkaMessage): Promise<void> {
    // Kafka consumer implementation
  }
}
```

## 🔄 Event-Driven Architecture

### Event Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Gateway   │───▶│ Task Manager│───▶│   Workers   │
│   Service   │    │   Service   │    │   (Future)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│requests-web-│    │ task-status │    │ task-status │
│   crawl     │    │   topic     │    │   topic     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Event Types

#### Task Lifecycle Events
1. **TaskCreated**: New task created
2. **TaskStarted**: Task processing started
3. **TaskCompleted**: Task completed successfully
4. **TaskFailed**: Task failed with error

#### System Events
1. **HealthCheck**: System health monitoring
2. **MetricsUpdate**: Performance metrics update
3. **ErrorOccurred**: System error notification

### Event Sourcing
The service uses event sourcing for task lifecycle management:
- **Event Store**: All events are stored in the database
- **Event Replay**: Can replay events to reconstruct state
- **Audit Trail**: Complete history of all task operations

## 📊 Data Flow Architecture

### Request Flow
```
1. HTTP Request → REST Controller
2. Controller → Application Service
3. Service → Domain Entity
4. Entity → Repository Adapter
5. Adapter → Database
6. Response flows back through layers
```

### Message Flow
```
1. Kafka Message → Consumer
2. Consumer → Message Handler
3. Handler → Application Service
4. Service → Domain Entity
5. Entity → Repository Adapter
6. Adapter → Database
7. Acknowledge message
```

### Metrics Flow
```
1. Database Functions → Metrics Data
2. Metrics Service → Prometheus Format
3. REST Endpoint → Metrics Response
4. Monitoring System → Metrics Collection
```

## 🔧 Configuration Architecture

### Configuration Layers
```
┌─────────────────────────────────────────────────────────────┐
│                Environment Variables                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Zod Schema Validation                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Configuration Objects                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Application Usage                            │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Modules
- **AppConfig**: Application-level configuration
- **DatabaseConfig**: PostgreSQL configuration
- **KafkaConfig**: Kafka configuration
- **ObservabilityConfig**: OpenTelemetry configuration
- **RestConfig**: REST API configuration

## 🔍 Observability Architecture

### Tracing Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Request   │───▶│   Span      │───▶│   Trace     │
│   Context   │    │   Creation  │    │   Export    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   W3C       │    │   Business  │    │   OTLP      │
│   Context   │    │   Events    │    │   Exporter  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Logging Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Logger    │───▶│   Log       │───▶│   Log       │
│   Service   │    │   Format    │    │   Export    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trace     │    │   JSON      │    │   OTLP      │
│   Context   │    │   Format    │    │   Exporter  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Metrics Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Metrics   │───▶│   Prometheus│───▶│   Monitoring│
│   Service   │    │   Format    │    │   System    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Database  │    │   Business  │    │   System    │
│   Functions │    │   Metrics   │    │   Metrics   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Scalability Architecture

### Horizontal Scaling
- **Stateless Services**: No local state, can scale horizontally
- **Database Connection Pooling**: Efficient connection management
- **Kafka Consumer Groups**: Multiple consumers for load distribution
- **Health Checks**: Kubernetes-ready for container orchestration

### Performance Optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Batch Processing**: Kafka message batching for performance
- **Caching**: Future Redis integration for caching

### Fault Tolerance
- **Circuit Breakers**: Prevent cascading failures
- **Retry Logic**: Exponential backoff for transient failures
- **Dead Letter Queues**: Handle failed messages
- **Health Monitoring**: Proactive failure detection

## 🔒 Security Architecture

### Security Layers
```
┌─────────────────────────────────────────────────────────────┐
│                Network Security                             │
│  (Firewalls, VPNs, Network Segmentation)                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Transport Security                           │
│  (TLS/SSL, Certificate Management)                         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Application Security                         │
│  (Input Validation, Authentication, Authorization)         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Data Security                                │
│  (Encryption, Data Masking, Audit Logging)                 │
└─────────────────────────────────────────────────────────────┘
```

### Security Measures
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **TLS/SSL**: Encrypted communication
- **Audit Logging**: Comprehensive security event logging

## 🧪 Testing Architecture

### Testing Pyramid
```
┌─────────────────────────────────────────────────────────────┐
│                E2E Tests (Few)                              │
│  (Complete workflow testing)                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Integration Tests (Some)                     │
│  (Database, Kafka, External Services)                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Unit Tests (Many)                            │
│  (Domain Logic, Services, Utilities)                       │
└─────────────────────────────────────────────────────────────┘
```

### Test Categories
- **Unit Tests**: Domain entities, services, utilities
- **Integration Tests**: Database operations, Kafka messaging
- **End-to-End Tests**: Complete workflow validation
- **Performance Tests**: Load testing and benchmarking

## 📚 Design Patterns

### Creational Patterns
- **Factory Pattern**: ApplicationFactory for service creation
- **Builder Pattern**: Configuration object building
- **Singleton Pattern**: Logger service singleton

### Structural Patterns
- **Adapter Pattern**: Repository and messaging adapters
- **Facade Pattern**: Service layer facades
- **Decorator Pattern**: Middleware decorators

### Behavioral Patterns
- **Observer Pattern**: Event-driven messaging
- **Strategy Pattern**: Different processing strategies
- **Template Method**: Base handler templates

## 🔄 Deployment Architecture

### Container Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                Kubernetes Cluster                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Task      │  │   Database  │  │   Kafka     │         │
│  │   Manager   │  │   (Postgres)│  │   Cluster   │         │
│  │   Pods      │  │   Pods      │  │   Pods      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Observability Stack                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Grafana   │  │   Prometheus│  │   Jaeger    │         │
│  │   (UI)      │  │   (Metrics) │  │   (Traces)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Service Discovery
- **Kubernetes Services**: Internal service discovery
- **Load Balancing**: Automatic load distribution
- **Health Checks**: Readiness and liveness probes
- **Auto-scaling**: Horizontal pod autoscaling

## 🚀 Future Architecture Considerations

### Microservices Evolution
- **Service Decomposition**: Split into smaller services
- **API Gateway**: Centralized API management
- **Service Mesh**: Advanced service-to-service communication
- **Event Sourcing**: Complete event-driven architecture

### Advanced Patterns
- **CQRS**: Command Query Responsibility Segregation
- **Saga Pattern**: Distributed transaction management
- **Event Sourcing**: Complete audit trail
- **Domain Events**: Rich domain event modeling

For more information about specific architectural components, see:
- [Configuration Guide](./configuration.md) - Configuration architecture
- [Database Documentation](./database.md) - Database architecture
- [Kafka Documentation](./kafka.md) - Messaging architecture
- [Observability Documentation](./observability.md) - Observability architecture

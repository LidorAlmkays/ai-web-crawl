# Gateway Service Refactor - Implementation Jobs Breakdown

## Overview

This document breaks down the comprehensive PRD into smaller, manageable jobs that can be implemented incrementally. Each job is self-contained with clear inputs, outputs, and testing criteria.

## Job Structure

Each job includes:
- **Objective**: What this job accomplishes
- **Prerequisites**: What must be completed before this job
- **Inputs**: What files/data are needed
- **Implementation Steps**: Detailed steps to complete
- **Outputs**: What files are created/modified
- **Testing Criteria**: How to validate the job is complete
- **Estimated Time**: Rough time estimate

---

## Job 1: Project Structure Setup

### Objective
Set up the basic project structure following clean architecture patterns.

### Prerequisites
- Git tag created for current gateway state
- Current gateway functionality documented

### Inputs
- Existing gateway directory structure
- Task-manager service structure (for reference)

### Implementation Steps
1. **Create new directory structure**
   ```bash
   apps/gateway/src/
   ├── api/
   │   └── rest/
   │       ├── dtos/
   │       ├── handlers/
   │       └── rest.router.ts
   ├── application/
   │   ├── ports/
   │   └── services/
   ├── common/
   │   ├── utils/
   │   ├── types/
   │   └── middleware/
   ├── config/
   ├── domain/
   │   └── entities/
   └── infrastructure/
       ├── messaging/
       │   └── kafka/
       └── metrics/
   ```

2. **Copy reusable utilities from task-manager**
   - Copy logger utility
   - Copy validation utility
   - Copy OpenTelemetry initialization
   - Copy configuration patterns

3. **Update package.json**
   - Remove unused dependencies
   - Ensure all required dependencies are available

### Outputs
- Complete directory structure
- Basic utility files copied and adapted
- Updated package.json

### Testing Criteria
- [ ] All directories exist
- [ ] Utility files are copied and working
- [ ] Package.json has correct dependencies
- [ ] No TypeScript compilation errors

### Estimated Time
2-3 hours

---

## Job 2: Configuration Management

### Objective
Set up configuration management with environment variables and validation.

### Prerequisites
- Job 1 completed (project structure)

### Inputs
- Environment variables from PRD
- Configuration patterns from task-manager

### Implementation Steps
1. **Create configuration files**
   ```typescript
   // config/index.ts
   // config/kafka.ts
   // config/observability.ts
   // config/server.ts
   ```

2. **Implement environment variable validation**
   - Validate required environment variables
   - Set default values where appropriate
   - Type-safe configuration objects

3. **Create configuration interfaces**
   - ServerConfig
   - KafkaConfig
   - ObservabilityConfig

### Outputs
- Configuration files with validation
- Type-safe configuration interfaces
- Environment variable documentation

### Testing Criteria
- [ ] Configuration loads without errors
- [ ] Environment variables are validated
- [ ] Type-safe configuration objects
- [ ] Default values work correctly

### Estimated Time
1-2 hours

---

## Job 3: OpenTelemetry Setup

### Objective
Set up OpenTelemetry initialization and basic tracing infrastructure.

### Prerequisites
- Job 1 completed (utilities copied)
- Job 2 completed (configuration)

### Inputs
- OpenTelemetry utilities from task-manager
- Observability configuration

### Implementation Steps
1. **Initialize OpenTelemetry**
   - Set up tracer
   - Configure exporters
   - Set up resource attributes

2. **Create trace context utilities**
   ```typescript
   // common/types/trace-context.type.ts
   // common/utils/trace-context.utils.ts
   ```

3. **Create basic middleware**
   - Trace context middleware
   - Request ID generation

### Outputs
- OpenTelemetry initialization
- Trace context utilities
- Basic middleware

### Testing Criteria
- [ ] OpenTelemetry initializes without errors
- [ ] Traces are generated and exported
- [ ] Trace context utilities work
- [ ] Middleware functions correctly

### Estimated Time
2-3 hours

---

## Job 4: Domain Entities

### Objective
Create domain entities for web crawl requests.

### Prerequisites
- Job 1 completed (domain structure)

### Inputs
- Web crawl request requirements from PRD

### Implementation Steps
1. **Create WebCrawlRequest entity**
   ```typescript
   // domain/entities/web-crawl-request.entity.ts
   ```

2. **Define entity properties**
   - Task ID
   - User email
   - Query
   - Original URL
   - Status
   - Timestamps

3. **Add entity methods**
   - Validation methods
   - Status transition methods

### Outputs
- WebCrawlRequest entity
- Entity validation logic
- Status management

### Testing Criteria
- [ ] Entity can be instantiated
- [ ] Validation works correctly
- [ ] Status transitions work
- [ ] All properties are accessible

### Estimated Time
1 hour

---

## Job 5: Application Ports

### Objective
Define application layer ports (interfaces) for clean architecture.

### Prerequisites
- Job 4 completed (domain entities)

### Inputs
- Port requirements from PRD

### Implementation Steps
1. **Create inbound ports**
   ```typescript
   // application/ports/web-crawl-request.port.ts
   ```

2. **Create outbound ports**
   ```typescript
   // application/ports/web-crawl-task-publisher.port.ts
   // application/ports/metrics.port.ts
   ```

3. **Define port interfaces**
   - Method signatures
   - Return types
   - Error handling

### Outputs
- Port interface definitions
- Type-safe contracts

### Testing Criteria
- [ ] All interfaces are defined
- [ ] TypeScript compilation passes
- [ ] Interfaces are properly exported

### Estimated Time
1 hour

---

## Job 6: Application Services

### Objective
Implement application layer services that orchestrate business logic.

### Prerequisites
- Job 5 completed (ports defined)

### Inputs
- Port interfaces
- Domain entities

### Implementation Steps
1. **Create WebCrawlRequestService**
   ```typescript
   // application/services/web-crawl-request.service.ts
   ```

2. **Implement business logic**
   - DTO validation
   - Entity creation
   - Task publishing
   - Error handling

3. **Create application factory**
   ```typescript
   // application/services/application.factory.ts
   ```

### Outputs
- Application services
- Business logic implementation
- Dependency injection setup

### Testing Criteria
- [ ] Services can be instantiated
- [ ] Business logic works correctly
- [ ] Error handling works
- [ ] Dependencies are injected properly

### Estimated Time
2-3 hours

---

## Job 7: Infrastructure - Kafka Publisher

### Objective
Implement Kafka publisher adapter for task publishing.

### Prerequisites
- Job 6 completed (application services)
- Job 2 completed (Kafka configuration)

### Inputs
- Kafka configuration
- Publisher port interface

### Implementation Steps
1. **Create Kafka factory**
   ```typescript
   // infrastructure/messaging/kafka/kafka.factory.ts
   ```

2. **Implement WebCrawlTaskPublisher**
   ```typescript
   // infrastructure/messaging/kafka/web-crawl-task.publisher.ts
   ```

3. **Add trace context propagation**
   - Include trace headers
   - Follow task-manager patterns

### Outputs
- Kafka publisher adapter
- Message publishing logic
- Trace context propagation

### Testing Criteria
- [ ] Can connect to Kafka
- [ ] Messages are published correctly
- [ ] Trace context is included
- [ ] Error handling works

### Estimated Time
2-3 hours

---

## Job 8: Infrastructure - Metrics

### Objective
Implement metrics collection adapter.

### Prerequisites
- Job 7 completed (Kafka publisher)

### Inputs
- Metrics port interface
- Prometheus patterns

### Implementation Steps
1. **Create PrometheusMetricsAdapter**
   ```typescript
   // infrastructure/metrics/prometheus-metrics.adapter.ts
   ```

2. **Implement metrics collection**
   - Request counter
   - Response time histogram
   - Error tracking

3. **Set up metrics endpoint**
   - Expose metrics on /metrics
   - Configure Prometheus scraping

### Outputs
- Metrics adapter
- Metrics endpoint
- Prometheus integration

### Testing Criteria
- [ ] Metrics are collected
- [ ] Metrics endpoint works
- [ ] Prometheus can scrape metrics
- [ ] Counters increment correctly

### Estimated Time
1-2 hours

---

## Job 9: API DTOs

### Objective
Create DTOs with validation for REST API.

### Prerequisites
- Job 8 completed (metrics)

### Inputs
- DTO requirements from PRD
- Validation patterns from task-manager

### Implementation Steps
1. **Create request DTO**
   ```typescript
   // api/rest/dtos/web-crawl-request.dto.ts
   ```

2. **Create response DTO**
   ```typescript
   // api/rest/dtos/web-crawl-response.dto.ts
   ```

3. **Add validation decorators**
   - Email validation
   - URL validation
   - Length constraints
   - Required fields

### Outputs
- Validated DTOs
- Type-safe request/response objects

### Testing Criteria
- [ ] DTOs validate correctly
- [ ] Error messages are clear
- [ ] TypeScript types work
- [ ] All validation rules enforced

### Estimated Time
1-2 hours

---

## Job 10: API Handlers

### Objective
Implement REST API handlers with trace context management.

### Prerequisites
- Job 9 completed (DTOs)

### Inputs
- DTOs
- Application services
- Trace context utilities

### Implementation Steps
1. **Create WebCrawlHandler**
   ```typescript
   // api/rest/handlers/web-crawl.handler.ts
   ```

2. **Implement trace context management**
   - Generate trace IDs
   - Create spans
   - Propagate context

3. **Add error handling**
   - Validation errors
   - Business logic errors
   - System errors

### Outputs
- API handlers
- Trace context management
- Error handling

### Testing Criteria
- [ ] Handlers process requests
- [ ] Trace context is created
- [ ] Errors are handled properly
- [ ] Response format is correct

### Estimated Time
2-3 hours

---

## Job 11: API Router

### Objective
Create REST router with middleware and endpoint registration.

### Prerequisites
- Job 10 completed (handlers)

### Inputs
- API handlers
- Middleware utilities

### Implementation Steps
1. **Create REST router**
   ```typescript
   // api/rest/rest.router.ts
   ```

2. **Add middleware**
   - Trace context middleware
   - Error handling middleware
   - Request logging

3. **Register endpoints**
   - POST /api/web-crawl
   - Health check endpoint
   - Metrics endpoint

### Outputs
- REST router
- Middleware setup
- Endpoint registration

### Testing Criteria
- [ ] Router handles requests
- [ ] Middleware executes
- [ ] Endpoints are accessible
- [ ] Error handling works

### Estimated Time
1-2 hours

---

## Job 12: Application Entry Points

### Objective
Create main application entry points (app.ts, server.ts).

### Prerequisites
- Job 11 completed (router)

### Inputs
- All components from previous jobs

### Implementation Steps
1. **Create app.ts**
   ```typescript
   // app.ts
   ```

2. **Create server.ts**
   ```typescript
   // server.ts
   ```

3. **Wire up all components**
   - Dependency injection
   - Middleware setup
   - Error handling

### Outputs
- Application entry points
- Complete service wiring

### Testing Criteria
- [ ] Application starts without errors
- [ ] All endpoints work
- [ ] Dependencies are wired correctly
- [ ] Graceful shutdown works

### Estimated Time
2-3 hours

---

## Job 13: Integration Testing

### Objective
Create comprehensive integration tests for the complete service.

### Prerequisites
- Job 12 completed (entry points)

### Inputs
- Complete service implementation

### Implementation Steps
1. **Create test setup**
   - Test utilities
   - Mock configurations
   - Test database setup

2. **Write integration tests**
   - End-to-end request flow
   - Kafka message publishing
   - Trace context propagation
   - Error scenarios

3. **Create test helpers**
   - Request generators
   - Response validators
   - Mock utilities

### Outputs
- Integration test suite
- Test utilities
- Test documentation

### Testing Criteria
- [ ] All tests pass
- [ ] Coverage is adequate
- [ ] Tests are reliable
- [ ] Performance is acceptable

### Estimated Time
3-4 hours

---

## Job 14: Documentation and Cleanup

### Objective
Complete documentation and final cleanup.

### Prerequisites
- Job 13 completed (integration tests)

### Inputs
- Complete service implementation

### Implementation Steps
1. **Update README.md**
   - Architecture overview
   - Setup instructions
   - API documentation

2. **Create API documentation**
   - Endpoint descriptions
   - Request/response examples
   - Error codes

3. **Final cleanup**
   - Remove unused files
   - Update package.json
   - Clean up comments

### Outputs
- Complete documentation
- Clean codebase
- Setup instructions

### Testing Criteria
- [ ] Documentation is complete
- [ ] Setup instructions work
- [ ] Code is clean
- [ ] No unused files

### Estimated Time
2-3 hours

---

## Implementation Schedule

### Week 1: Foundation
- **Day 1-2**: Jobs 1-3 (Structure, Config, OTEL)
- **Day 3-4**: Jobs 4-6 (Domain, Ports, Services)
- **Day 5**: Testing and validation

### Week 2: Infrastructure
- **Day 1-2**: Jobs 7-8 (Kafka, Metrics)
- **Day 3-4**: Jobs 9-10 (DTOs, Handlers)
- **Day 5**: Testing and validation

### Week 3: API and Integration
- **Day 1-2**: Jobs 11-12 (Router, Entry Points)
- **Day 3-4**: Job 13 (Integration Testing)
- **Day 5**: Job 14 (Documentation)

## Success Metrics

### Technical Metrics
- [ ] All jobs completed successfully
- [ ] 100% test coverage for critical paths
- [ ] Sub-100ms response times
- [ ] Zero memory leaks
- [ ] Proper error handling

### Quality Metrics
- [ ] Clean architecture principles followed
- [ ] Code is maintainable and readable
- [ ] Documentation is complete
- [ ] No technical debt introduced

### Operational Metrics
- [ ] Service starts without errors
- [ ] All endpoints respond correctly
- [ ] Kafka messages are published
- [ ] Traces are generated and exported
- [ ] Metrics are collected

## Risk Mitigation

### Technical Risks
- **Kafka connectivity issues**: Implement retry logic and circuit breakers
- **OpenTelemetry setup problems**: Use proven patterns from task-manager
- **DTO validation failures**: Comprehensive testing and error handling

### Timeline Risks
- **Job dependencies**: Clear prerequisite tracking
- **Integration complexity**: Incremental testing at each job
- **Knowledge transfer**: Document decisions and patterns

### Quality Risks
- **Architecture drift**: Regular reviews against PRD
- **Testing gaps**: Comprehensive test coverage requirements
- **Performance issues**: Early performance testing

This job breakdown ensures that each piece can be implemented, tested, and validated independently, making the overall refactor much more manageable and reducing risk.

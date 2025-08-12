# PRD-7: OTEL Logger Redesign Project Overview

## Project Summary

This project redesigns the OpenTelemetry logger system for the task-manager service to fix current issues and provide a robust, production-ready logging solution.

## Problem Statement

The current OTEL logger implementation has several critical issues:

- **Race Condition**: Logger initialized before OTEL SDK is ready
- **Silent Failures**: OTEL logs not reaching collector with no error feedback
- **No Error Handling**: System crashes when OTEL fails
- **Inconsistent Singleton**: Multiple logger instances can be created
- **Complex Dependencies**: Mixing Winston + OTEL creates unnecessary complexity

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           ILogger Interface                     │
├─────────────────────────────────────────────────────────────────┤
│                      LoggerFactory (Singleton)                 │
├─────────────────────────────────────────────────────────────────┤
│                      OTELLogger Implementation                  │
│    • Console (formatted output)                                │
│    • OTEL Collector (structured logs)                          │
│    • Error handling with fallback                              │
└─────────────────────────────────────────────────────────────────┘
```

## Job Dependencies

```
Job 1: Clean Slate ──────→ Job 2: Core Interface & Factory
                                    │
                                    ▼
                           Job 3: OTEL Logger Implementation
                                    │
                                    ▼
                           Job 4: Integration & Global Export
                                    │
                                    ▼
                           Job 5: Testing & Validation
                                    │
                                    ▼
                           Job 6: Documentation & Migration
```

## Job Breakdown

### Job 1: Clean Slate Preparation

**Duration**: 1-2 hours | **Dependency Level**: 0

Remove existing broken logger implementation and prepare clean structure.

**Key Tasks**:

- Remove old logger files and Winston dependencies
- Create new logging folder structure
- Install temporary logger to prevent build failures
- Verify application builds and starts

**Deliverables**:

- Clean project structure
- Temporary logger placeholder
- Working build system

---

### Job 2: Core Interface and Factory Design

**Duration**: 2-3 hours | **Dependency Level**: 1 | **Depends on**: Job 1

Build the architectural foundation with interfaces and factory pattern.

**Key Tasks**:

- Define `ILogger` interface and configuration types
- Create comprehensive TypeScript types and enums
- Implement singleton `LoggerFactory` with lifecycle management
- Build configuration utilities with environment parsing

**Deliverables**:

- Core interfaces (`ILogger`, `LoggerConfig`, `LogRecord`)
- Type definitions and error classes
- Singleton factory with proper lifecycle
- Configuration utilities

---

### Job 3: OTEL Logger Implementation

**Duration**: 3-4 hours | **Dependency Level**: 2 | **Depends on**: Job 2

Implement the core OTEL logger with console output and collector integration.

**Key Tasks**:

- Create console formatter matching user's preferred format
- Implement error handler with circuit breaker pattern
- Build OTEL logger with SDK integration
- Add async processing for non-blocking performance

**Deliverables**:

- Console formatter with exact format: `[level:X,service:Y,timestamp:Z]:message`
- Robust error handling with fallback
- Complete OTEL logger implementation
- OTEL SDK integration

---

### Job 4: Integration and Global Export

**Duration**: 2-3 hours | **Dependency Level**: 3 | **Depends on**: Job 3

Wire the logger into application lifecycle and provide global access.

**Key Tasks**:

- Create global logger export for project-wide usage
- Integrate with application startup/shutdown sequence
- Ensure proper initialization order: OTEL → Logger → Application
- Implement graceful shutdown with resource cleanup

**Deliverables**:

- Global logger export
- Application lifecycle integration
- Proper startup sequence
- Graceful shutdown handling

---

### Job 5: Testing and Validation

**Duration**: 2-3 hours | **Dependency Level**: 4 | **Depends on**: Job 4

Create comprehensive test suite and validate system performance.

**Key Tasks**:

- Unit tests for all logger components
- Integration tests with OTEL collector
- Performance validation (< 1ms overhead requirement)
- Error scenario and memory usage testing

**Deliverables**:

- Complete test suite with >90% coverage
- Integration tests with OTEL collector
- Performance benchmarks
- Error scenario validation

---

### Job 6: Documentation and Migration

**Duration**: 1-2 hours | **Dependency Level**: 5 | **Depends on**: Job 5

Complete documentation and finalize production readiness.

**Key Tasks**:

- Create comprehensive README and API documentation
- Update package dependencies and remove old packages
- Create migration checklist and production deployment guide
- Perform final end-to-end validation

**Deliverables**:

- Complete documentation
- Migration checklist
- Production deployment guide
- Validated production-ready system

## Key Features

### ✅ Console Output Format

Exact match to user preference:

```
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Message content
```

### ✅ OTEL Integration

- Structured logs sent to collector
- Batch processing for efficiency
- Service identification and metadata
- Trace/span correlation support

### ✅ Error Handling

- Circuit breaker pattern for OTEL failures
- Graceful fallback to console-only mode
- Automatic recovery with cooldown periods
- Never blocks application flow

### ✅ Performance

- < 1ms overhead per log statement
- Async OTEL transmission
- Memory-efficient processing
- High throughput (1000+ logs/second)

### ✅ Production Ready

- Comprehensive error handling
- Proper lifecycle management
- Environment-based configuration
- Monitoring and troubleshooting support

## Success Criteria

### Functional Requirements

1. ✅ All logs appear in console with correct formatting
2. ✅ All logs sent to OTEL collector successfully
3. ✅ OTEL collector forwards logs to Loki
4. ✅ Logger works as singleton throughout application
5. ✅ Error handling gracefully falls back to console-only mode
6. ✅ Proper initialization order (OTEL → Logger → Application)

### Performance Requirements

1. ✅ < 1ms overhead per log statement
2. ✅ < 10MB memory footprint for logger
3. ✅ 99.9% log delivery success rate
4. ✅ >90% test coverage
5. ✅ Zero breaking changes to existing logger interface

## Technical Specifications

### Dependencies

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/api-logs": "^0.45.0",
    "@opentelemetry/sdk-logs": "^0.45.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.45.0",
    "@opentelemetry/resources": "^1.17.0",
    "@opentelemetry/semantic-conventions": "^1.17.0"
  }
}
```

### Environment Variables

```bash
SERVICE_NAME=task-manager                      # Service identification
LOG_LEVEL=info                                # debug|info|warn|error
NODE_ENV=development                          # development|production|test
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # OTEL collector URL
```

### File Structure

```
src/common/utils/logging/
├── interfaces.ts            # ILogger and config interfaces
├── types.ts                # Type definitions and error classes
├── config.ts               # Configuration utilities
├── logger-factory.ts       # Singleton factory implementation
├── otel-logger.ts          # Core OTEL logger implementation
├── formatters.ts           # Console output formatters
├── error-handler.ts        # Error handling utilities
├── index.ts                # Module exports
├── README.md               # Documentation
└── __tests__/              # Test files
    ├── logger-factory.spec.ts
    ├── otel-logger.spec.ts
    ├── integration.spec.ts
    ├── performance.spec.ts
    └── error-scenarios.spec.ts
```

## Risk Mitigation

### Technical Risks

- **OTEL SDK Breaking Changes**: Pin exact versions in package.json
- **Performance Impact**: Async processing and performance benchmarks
- **Memory Leaks**: Proper cleanup and memory monitoring
- **Network Failures**: Circuit breaker and retry logic

### Operational Risks

- **Silent Failures**: Comprehensive error logging and monitoring
- **Configuration Issues**: Validation on startup with sensible defaults
- **Dependency Conflicts**: Exact version matching and testing

## Rollback Plan

### Immediate Rollback

1. Restore backed up logger implementation
2. Reinstall Winston dependencies
3. Update imports to use previous logger

### Graceful Migration

1. Implement feature flag for new vs old logger
2. A/B test with percentage-based rollout
3. Monitor metrics during transition
4. Full rollback if success criteria not met

## Execution Timeline

**Total Estimated Time**: 11-17 hours

- **Job 1**: 1-2 hours
- **Job 2**: 2-3 hours
- **Job 3**: 3-4 hours
- **Job 4**: 2-3 hours
- **Job 5**: 2-3 hours
- **Job 6**: 1-2 hours

## Getting Started

1. **Review** this overview and individual job documents
2. **Approve** the approach and job breakdown
3. **Execute** jobs in dependency order (1 → 2 → 3 → 4 → 5 → 6)
4. **Validate** each job before proceeding to the next
5. **Deploy** to production after Job 6 completion

---

**Ready to proceed with Job 1: Clean Slate Preparation?**


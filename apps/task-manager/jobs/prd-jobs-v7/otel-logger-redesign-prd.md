# PRD-7: OpenTelemetry Logger Redesign

## Executive Summary

### Problem Statement

The current OTEL logger implementation in the task-manager service is not properly sending logs to the OpenTelemetry collector, despite having the infrastructure in place. The logger combines Winston and OTEL SDKs but lacks proper initialization order, configuration, and error handling. The singleton pattern is not properly implemented, and there's no clear interface contract for the logging system.

### Solution Overview

Redesign the logging system with:

1. **Clean Interface Design**: Define a clear `ILogger` interface for the entire project
2. **Proper OTEL Integration**: Ensure logs are sent to both console and OTEL collector
3. **Singleton Factory Pattern**: Manage logger state through a factory with proper initialization
4. **Configuration Management**: Environment-based configuration with proper defaults
5. **Error Handling**: Robust error handling for OTEL failures with fallback to console
6. **Initialization Order**: Proper startup sequence ensuring OTEL is ready before logger creation

## Current State Analysis

### Current Issues Identified

1. **Initialization Race Condition**: Logger is created before OTEL SDK is fully initialized
2. **Missing LoggerProvider Integration**: Logger uses `logs.getLogger()` without proper provider setup
3. **No Error Handling**: OTEL failures are silent, no fallback mechanism
4. **Inconsistent Singleton**: Multiple instances can be created
5. **Complex Dependencies**: Mixing Winston and OTEL creates unnecessary complexity
6. **No Interface Contract**: No standardized interface for project-wide usage

### Current Architecture

```
server.ts
├── initOpenTelemetry() // Initializes OTEL SDK
├── TaskManagerApplication()
└── logger.info() // Uses OtelLogger instance

OtelLogger Class
├── winston.Logger (console output)
├── logs.getLogger() (OTEL output)
└── Mixed approach with dual logging
```

## Target Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                           ILogger Interface                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  info(message, metadata?) → void                           ││
│  │  warn(message, metadata?) → void                           ││
│  │  error(message, metadata?) → void                          ││
│  │  debug(message, metadata?) → void                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LoggerFactory (Singleton)                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  getInstance() → LoggerFactory                             ││
│  │  initialize(config: LoggerConfig) → Promise<void>          ││
│  │  getLogger() → ILogger                                     ││
│  │  isInitialized() → boolean                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OTELLogger Implementation                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  - Console output (formatted)                              ││
│  │  - OTEL collector output                                   ││
│  │  - Error handling with fallback                            ││
│  │  - Structured logging                                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Strategy

#### Phase 1: Interface and Factory Design

1. **ILogger Interface**: Define the contract for all logging operations
2. **LoggerConfig Interface**: Configuration structure for initialization
3. **LoggerFactory**: Singleton factory for managing logger lifecycle
4. **Error Types**: Custom error types for logging failures

#### Phase 2: OTEL Logger Implementation

1. **OTELLogger Class**: Core implementation using OTEL SDK directly
2. **Console Formatter**: Structured console output matching user preferences
3. **OTEL Integration**: Proper integration with LoggerProvider
4. **Fallback Mechanism**: Console-only mode when OTEL fails

#### Phase 3: Integration and Migration

1. **App Integration**: Proper initialization in app.ts
2. **Global Export**: Single point of access for the entire project
3. **Testing**: Comprehensive test coverage
4. **Migration**: Replace existing logger usage

## Detailed Technical Specification

### 1. Interface Definitions

```typescript
interface ILogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
}

interface LoggerConfig {
  serviceName: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableOTEL: boolean;
  otelEndpoint?: string;
  environment: 'development' | 'production' | 'test';
}

interface LogRecord {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  spanId?: string;
}
```

### 2. LoggerFactory Implementation

```typescript
class LoggerFactory {
  private static instance: LoggerFactory;
  private logger: ILogger | null = null;
  private config: LoggerConfig | null = null;
  private isReady = false;

  static getInstance(): LoggerFactory;
  async initialize(config: LoggerConfig): Promise<void>;
  getLogger(): ILogger;
  isInitialized(): boolean;
  async shutdown(): Promise<void>;
}
```

### 3. OTELLogger Implementation

```typescript
class OTELLogger implements ILogger {
  private loggerProvider: LoggerProvider;
  private otelLogger: ReturnType<typeof logs.getLogger>;
  private config: LoggerConfig;
  private isOTELAvailable: boolean;

  constructor(config: LoggerConfig);
  private initializeOTEL(): Promise<void>;
  private formatConsoleOutput(record: LogRecord): string;
  private sendToOTEL(record: LogRecord): void;
  private logToConsole(record: LogRecord): void;
}
```

### 4. Console Output Format

Following user preference: `[level:severity,service:servicename,timestamp:datetime]:message`

```typescript
const formatConsoleOutput = (record: LogRecord): string => {
  return `[level:${record.level},service:${record.service},timestamp:${record.timestamp}]:${record.message}`;
};
```

### 5. Configuration Management

```typescript
const getLoggerConfig = (): LoggerConfig => ({
  serviceName: process.env.SERVICE_NAME || 'task-manager',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  enableConsole: true,
  enableOTEL: process.env.NODE_ENV !== 'test',
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  environment: (process.env.NODE_ENV as any) || 'development',
});
```

## Implementation Plan

### Job 1: Clean Slate Preparation

**Duration**: 1-2 hours  
**Description**: Remove existing logger implementation and prepare project structure

**Tasks**:

1. Remove existing logger files and dependencies
2. Update package.json to include only required OTEL packages
3. Create new folder structure: `src/common/utils/logging/`
4. Remove Winston dependency (use only OTEL + console)

**Deliverables**:

- Cleaned project structure
- Updated dependencies
- Empty logging folder ready for new implementation

### Job 2: Core Interface and Factory Design

**Duration**: 2-3 hours  
**Description**: Implement the foundation interfaces and factory pattern

**Tasks**:

1. Create `ILogger` interface with method signatures
2. Create `LoggerConfig` interface for configuration
3. Implement `LoggerFactory` singleton with proper lifecycle management
4. Create configuration utility functions
5. Add comprehensive TypeScript types

**Deliverables**:

- `src/common/utils/logging/interfaces.ts`
- `src/common/utils/logging/logger-factory.ts`
- `src/common/utils/logging/config.ts`
- `src/common/utils/logging/types.ts`

### Job 3: OTEL Logger Implementation

**Duration**: 3-4 hours  
**Description**: Core OTEL logger implementation with console output

**Tasks**:

1. Implement `OTELLogger` class following `ILogger` interface
2. Configure OTEL LoggerProvider with proper initialization
3. Implement console formatting matching user preferences
4. Add error handling and fallback mechanisms
5. Implement structured logging with metadata support

**Deliverables**:

- `src/common/utils/logging/otel-logger.ts`
- `src/common/utils/logging/formatters.ts`
- `src/common/utils/logging/error-handler.ts`

### Job 4: Integration and Global Export

**Duration**: 2-3 hours  
**Description**: Integrate logger with application lifecycle and create global access

**Tasks**:

1. Create main logger export file
2. Update `app.ts` to properly initialize logger after OTEL
3. Update `server.ts` to use new logger interface
4. Ensure proper initialization order (OTEL → Logger → App)
5. Add graceful shutdown handling

**Deliverables**:

- `src/common/utils/logging/index.ts`
- Updated `src/app.ts`
- Updated `src/server.ts`
- `src/common/utils/logger.ts` (global export)

### Job 5: Testing and Validation

**Duration**: 2-3 hours  
**Description**: Comprehensive testing and validation of the new logger

**Tasks**:

1. Create unit tests for all logger components
2. Create integration tests for OTEL collector communication
3. Test console output formatting
4. Test error scenarios and fallback behavior
5. Performance testing for high-volume logging

**Deliverables**:

- `src/common/utils/logging/__tests__/`
- Integration test for OTEL collector
- Performance benchmarks
- Test coverage report

### Job 6: Documentation and Migration

**Duration**: 1-2 hours  
**Description**: Documentation and final migration steps

**Tasks**:

1. Create comprehensive README for logging system
2. Update any remaining logger imports in the project
3. Create migration guide
4. Add JSDoc comments to all public interfaces
5. Final verification of OTEL collector integration

**Deliverables**:

- `src/common/utils/logging/README.md`
- Migration guide
- Complete JSDoc documentation
- Verified OTEL collector integration

## File Structure

```
src/common/utils/logging/
├── index.ts                 # Main export file
├── interfaces.ts            # ILogger and config interfaces
├── logger-factory.ts        # Singleton factory implementation
├── otel-logger.ts          # Core OTEL logger implementation
├── config.ts               # Configuration utilities
├── types.ts                # TypeScript type definitions
├── formatters.ts           # Console output formatters
├── error-handler.ts        # Error handling utilities
├── README.md               # Documentation
└── __tests__/              # Test files
    ├── logger-factory.spec.ts
    ├── otel-logger.spec.ts
    ├── formatters.spec.ts
    ├── integration.spec.ts
    └── performance.spec.ts

src/common/utils/
└── logger.ts               # Global logger export (for compatibility)
```

## Dependencies

### Required Packages

```json
{
  "@opentelemetry/api": "^1.7.0",
  "@opentelemetry/api-logs": "^0.45.0",
  "@opentelemetry/sdk-logs": "^0.45.0",
  "@opentelemetry/exporter-logs-otlp-http": "^0.45.0",
  "@opentelemetry/resources": "^1.17.0",
  "@opentelemetry/semantic-conventions": "^1.17.0"
}
```

### Removed Dependencies

```json
{
  "winston": "removed - replaced with native console + OTEL"
}
```

## Configuration

### Environment Variables

```bash
# Service identification
SERVICE_NAME=task-manager

# Logging configuration
LOG_LEVEL=info                    # debug|info|warn|error
NODE_ENV=development             # development|production|test

# OTEL configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### OTEL Collector Configuration

No changes required to the existing OTEL collector configuration as it already supports logs pipeline:

```yaml
service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [otlphttp/loki, debug]
```

## Success Criteria

### Functional Requirements

1. ✅ All logs appear in console with correct formatting
2. ✅ All logs are sent to OTEL collector successfully
3. ✅ OTEL collector forwards logs to Loki
4. ✅ Logger works as singleton throughout the application
5. ✅ Error handling gracefully falls back to console-only mode
6. ✅ Proper initialization order (OTEL → Logger → Application)

### Non-Functional Requirements

1. ✅ Zero breaking changes to existing logger interface
2. ✅ Performance: < 1ms overhead per log statement
3. ✅ Memory: < 10MB memory footprint for logger
4. ✅ Reliability: 99.9% log delivery success rate
5. ✅ Testability: >90% code coverage
6. ✅ Maintainability: Clear separation of concerns

### Validation Steps

1. **Console Output Test**: Verify logs appear in console with correct format
2. **OTEL Integration Test**: Verify logs reach OTEL collector (check debug output)
3. **Loki Integration Test**: Verify logs appear in Loki via Grafana
4. **Performance Test**: Measure logging overhead under load
5. **Error Scenario Test**: Verify fallback behavior when OTEL is unavailable
6. **Singleton Test**: Verify single instance across multiple imports

## Risk Mitigation

### Technical Risks

1. **OTEL SDK Breaking Changes**: Pin specific versions in package.json
2. **Performance Impact**: Implement async logging with batching
3. **Memory Leaks**: Proper cleanup in shutdown handlers
4. **Network Failures**: Robust retry logic with exponential backoff

### Operational Risks

1. **Silent Failures**: Comprehensive error logging and monitoring
2. **Configuration Drift**: Validate configuration on startup
3. **Dependency Conflicts**: Use exact version matching

## Testing Strategy

### Unit Tests

- Logger factory initialization and lifecycle
- OTEL logger implementation details
- Console formatter output validation
- Error handling scenarios
- Configuration parsing and validation

### Integration Tests

- End-to-end logging pipeline (App → OTEL → Loki)
- Performance under concurrent load
- Error recovery and fallback behavior
- Memory usage and leak detection

### Acceptance Tests

- Verify logs appear in Grafana/Loki dashboard
- Validate log correlation with traces
- Confirm proper service identification in logs
- Test log filtering and searching capabilities

## Monitoring and Observability

### Success Metrics

- **Log Delivery Rate**: Percentage of logs successfully sent to OTEL
- **Performance Impact**: Latency overhead introduced by logging
- **Error Rate**: Frequency of logging system errors
- **Memory Usage**: Memory footprint of logging components

### Alerting

- OTEL collector connectivity failures
- High error rates in logging system
- Performance degradation exceeding thresholds
- Memory usage spikes

## Rollback Plan

### Immediate Rollback

1. Revert to previous logger implementation
2. Restore Winston dependencies
3. Update imports to use previous logger

### Graceful Migration

1. Implement feature flag for new vs old logger
2. A/B test with percentage-based rollout
3. Monitor metrics during transition period
4. Full rollback if success criteria not met

---

_This PRD provides a comprehensive blueprint for redesigning the OTEL logger system with proper architecture, clear interfaces, and robust implementation strategy._

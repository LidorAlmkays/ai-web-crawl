# PRD V6: Complete Observability Implementation with Clean Architecture

## Overview

This PRD outlines the complete implementation of an observability stack for the Task Manager application, ensuring all data flows through the OpenTelemetry Collector to maintain clean architecture principles.

## Goals

- Implement complete observability (metrics, logs, traces)
- Ensure all data flows through OTEL Collector
- Maintain clean architecture principles
- Provide production-ready monitoring solution

## Architecture Flow

```
Task Manager Application
    ↓ (OTLP)
OTEL Collector
    ↓ (OTLP)
├── Prometheus (Metrics)
├── Tempo (Traces)
└── Loki (Logs)
    ↓
Grafana (Visualization)
```

## Jobs Overview

### Job 1: Clean Up Unnecessary Code and Files

**Purpose**: Remove all log forwarder remnants and clean up architecture violations

**Key Changes:**

- Remove debug logging spam from OTEL logger
- Clean up logger factory debug output
- Remove any log forwarder remnants
- Prepare for proper OTEL SDK implementation

**Files Modified:**

- `apps/task-manager/src/common/utils/loggers/otel-logger.ts`
- `apps/task-manager/src/common/utils/loggers/logger-factory.ts`
- `deployment/observability/configs/otel-collector.yaml`

**Estimated Time**: 30 minutes

---

### Job 2: Configure OTEL Collector to Send Logs Directly to Loki

**Purpose**: Implement direct OTEL Collector → Loki communication using OTLP protocol

**Key Changes:**

- Add `otlphttp/loki` exporter to OTEL Collector
- Configure Loki OTLP endpoint
- Update logs pipeline to include Loki exporter
- Eliminate need for log forwarders

**Files Modified:**

- `deployment/observability/configs/otel-collector.yaml`

**Estimated Time**: 45 minutes

---

### Job 3: Enhanced OTEL SDK Logging ✅ COMPLETED

**Purpose**: Simplify logging to use only OTEL logger with enhanced console output

**Key Changes:**

- ✅ Removed SimpleLogger completely
- ✅ Made OtelLogger the only logger type
- ✅ Enhanced console output with better colors and formatting
- ✅ Simplified logger factory logic
- ✅ Set OTEL as default logger

**Files Modified:**

- ✅ `apps/task-manager/src/common/utils/loggers/otel-logger.ts`
- ✅ `apps/task-manager/src/common/utils/loggers/logger-factory.ts`
- ✅ `apps/task-manager/src/common/utils/loggers/index.ts`
- ✅ Removed `apps/task-manager/src/common/utils/loggers/simple-logger.ts`

**Status**: ✅ COMPLETED - Enhanced console output with bold service names, dimmed timestamps, and better color scheme

---

### Job 4: Loki Integration (Future Job)

**Purpose**: Implement proper Loki integration for log storage and querying

**Key Changes:**

- Research and implement compatible Loki OTLP integration
- Configure Loki schema v13 with tsdb storage
- Update OTEL Collector configuration for Loki compatibility
- Test log querying in Grafana

**Files Modified:**

- `deployment/observability/configs/loki.yaml`
- `deployment/observability/configs/otel-collector.yaml`
- `apps/task-manager/src/common/utils/loggers/otel-logger.ts`

**Estimated Time**: 120 minutes

**Note**: This job was deferred due to Loki compatibility issues with structured metadata. Will be revisited after core observability is complete.

---

### Job 5: Implement Distributed Tracing with Tempo

**Purpose**: Complete the tracing implementation using Tempo as the backend

**Key Changes:**

- Add tracing initialization to OTEL setup
- Implement custom spans for business operations
- Add database and Kafka operation tracing
- Correlate logs with traces

**Files Modified:**

- `apps/task-manager/src/common/utils/otel-init.ts`
- `apps/task-manager/src/api/rest/rest.router.ts`
- `apps/task-manager/src/application/services/*.ts`
- `apps/task-manager/src/infrastructure/persistence/*.ts`
- `apps/task-manager/src/api/kafka/kafka-api.manager.ts`
- `apps/task-manager/src/common/utils/trace-utils.ts` (new)
- `package.json` (add tracing dependencies)

**Estimated Time**: 120 minutes

---

### Job 5: Final Integration and Testing

**Purpose**: Ensure all observability components work together seamlessly

**Key Changes:**

- Verify complete observability stack integration
- Test all data flows through OTEL Collector
- Validate error scenarios and proper logging
- Ensure clean architecture compliance

**Files Verified:**

- `deployment/observability/docker-compose.yml`
- `deployment/observability/configs/otel-collector.yaml`
- `deployment/observability/configs/grafana/provisioning/`

**Estimated Time**: 60 minutes

## Dependencies and Order

1. **Job 1** → **Job 2** → **Job 3** → **Job 4** → **Job 5**
2. Each job builds upon the previous one
3. All observability services must be running
4. Clean architecture principles must be maintained throughout

## Success Criteria

### Technical Success

- ✅ All data flows through OTEL Collector
- ✅ No direct connections to observability backends
- ✅ Complete observability stack working
- ✅ Clean, maintainable code architecture

### Functional Success

- ✅ Metrics appear in Prometheus and Grafana
- ✅ Logs appear in Loki and Grafana
- ✅ Traces appear in Tempo and Grafana
- ✅ Log-trace correlation working

### Performance Success

- ✅ No significant performance degradation
- ✅ Acceptable logging and tracing performance
- ✅ Resource usage within limits
- ✅ Production-ready implementation

## Clean Architecture Compliance

### Principles Maintained

- **Dependency Inversion**: Application depends on abstractions, not concrete implementations
- **Separation of Concerns**: Each layer has distinct responsibilities
- **Single Responsibility**: Each component has one reason to change
- **Open/Closed**: Open for extension, closed for modification

### Architecture Validation

- ✅ All data flows through OTEL Collector (Infrastructure layer)
- ✅ Application layer uses OTEL SDK (Abstraction)
- ✅ No direct connections to observability backends
- ✅ Proper separation between layers

## Risk Mitigation

### Technical Risks

- **OTEL SDK Compatibility**: Use stable versions and test thoroughly
- **Performance Impact**: Monitor and optimize as needed
- **Configuration Complexity**: Document and simplify where possible

### Rollback Strategy

- Each job can be rolled back independently
- Previous working state can be restored
- Incremental fixes can be applied

## Timeline

- **Total Estimated Time**: 345 minutes (5.75 hours)
- **Recommended Approach**: Complete jobs sequentially
- **Testing**: Each job includes comprehensive testing
- **Validation**: Final integration testing ensures everything works together

## Documentation Requirements

- Update README with observability setup
- Document data flow architecture
- Provide troubleshooting guide
- Document configuration options

## Future Enhancements

- Add alerting rules for Prometheus
- Implement custom Grafana dashboards
- Add performance monitoring
- Implement log retention policies

---

**Status**: Ready for Implementation
**Approval Required**: User approval needed before starting any job
**Next Step**: Wait for user to say "OK START TO WORK"

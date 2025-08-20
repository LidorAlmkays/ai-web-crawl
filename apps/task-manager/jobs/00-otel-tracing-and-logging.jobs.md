# Task Manager OTEL Tracing & Logging - Job Dependency Manager

## Overview
This file manages the dependencies between all OTEL tracing and logging jobs. Each job is split into its own file for better organization and tracking.

## Job Dependencies

```mermaid
graph TD
    J1[J1: Enable Auto-Instrumentation] --> J2[J2: Logger Core Enrichment]
    J1 --> J3[J3: Simplify HTTP Middleware]
    J1 --> J4[J4: Simplify Kafka Operations]
    J2 --> J5[J5: DTO Validation]
    J3 --> J6[J6: Business Attributes]
    J4 --> J6
    J5 --> J7[J7: Console Debugging]
    J6 --> J8[J8: Documentation]
    J7 --> J8
    J8 --> J9[J9: Cleanup Obsolete Code]
```

## Job Status Tracking

| Job | File | Status | Dependencies | Priority |
|-----|------|--------|--------------|----------|
| J1 | [01-enable-auto-instrumentation.md](./01-enable-auto-instrumentation.md) | ✅ Completed | None | 🔴 Critical |
| J2 | [02-logger-core-enrichment.md](./02-logger-core-enrichment.md) | ✅ Completed | J1 | 🔴 Critical |
| J3 | [03-simplify-http-middleware.md](./03-simplify-http-middleware.md) | ✅ Completed | J1 | 🟡 Medium |
| J4 | [04-simplify-kafka-operations.md](./04-simplify-kafka-operations.md) | ✅ Completed | J1 | 🟡 Medium |
| J5 | [05-dto-validation.md](./05-dto-validation.md) | ✅ Completed | J2 | 🟡 Medium |
| J6 | [06-business-attributes.md](./06-business-attributes.md) | ✅ Completed | J3, J4 | 🟢 Low |
| J7 | [07-console-debugging.md](./07-console-debugging.md) | ✅ Completed | J5 | 🟢 Low |
| J8 | [08-documentation.md](./08-documentation.md) | ⏳ Pending | J6, J7 | 🟢 Low |
| J9 | [09-cleanup-obsolete-code.md](./09-cleanup-obsolete-code.md) | ✅ Completed | J1-J8 | 🟢 Low |
| J10 | Update Kafka Test Script (publish-new-task) | Low | J5 | ✅ Completed | 0.5-1 hour |

| J11 | Logging Policy Overhaul (Noise Reduction + Signal) | High | J1-J7, J9, J10 | ✅ Completed | 1-2 hours |
| J12 | Error Handling Architecture (Infra→App→API) | High | J11 | ⏭️ Skipped | 1-2 hours |
| J13 | Kafka CLI Trace Enrichment (Service-like Emitter) | High | J1, J10 | ✅ Completed | 0.5-1 hour |
| J14 | Deduplicate Success Logging | Medium | J11 | ✅ Completed | 0.5-1 hour |
| J15 | Base Trace DTO (W3C) + CorrelationId Cleanup | High | J5, J11 | ✅ Completed | 1 hour |

## Implementation Phases

### Phase 1: Foundation (Critical Path)
- **J1**: Enable Auto-Instrumentation
- **J2**: Logger Core Enrichment

### Phase 2: Context Propagation (Medium Priority)
- **J3**: Simplify HTTP Middleware
- **J4**: Simplify Kafka Operations
- **J5**: DTO Validation

### Phase 3: Enhancement (Low Priority)
- **J6**: Business Attributes
- **J7**: Console Debugging
- **J8**: Documentation

### Phase 4: Cleanup (Final)
- **J9**: Cleanup Obsolete Code

## Quick Start Guide

1. **Start with J1**: Enable auto-instrumentation first
2. **Then J2**: Update logger to extract trace context
3. **Continue with J3-J4**: Simplify HTTP and Kafka operations
4. **Complete with J5-J8**: Add validation, attributes, and documentation
5. **Finish with J9**: Clean up obsolete code and artifacts

## Status Legend
- ⏳ Pending
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- ⚠️ Needs Review

## Notes
- Update the status in each job file as you complete them
- Each job file contains detailed implementation steps
- Dependencies must be completed before starting dependent jobs
- All jobs should be completed for full OTEL integration
- J9 (Cleanup) should be done last to remove obsolete code

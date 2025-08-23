# Job 1: Project Structure Setup

## Objective
Set up the basic project structure following clean architecture patterns and copy reusable utilities from the task-manager service.

## Prerequisites
- Git tag created for current gateway state: `gateway-v1.0.0-before-refactor`
- Current gateway functionality documented in a separate file

## Inputs
- Existing gateway directory structure at `apps/gateway/src/`
- Task-manager service structure at `apps/task-manager/src/` (for reference)
- Root workspace `package.json` for dependency versions

## Detailed Implementation Steps

### Step 1: Create New Directory Structure

Create the following directory structure in `apps/gateway/src/`:

```bash
apps/gateway/src/
├── api/
│   └── rest/
│       ├── dtos/
│       │   ├── index.ts
│       │   ├── web-crawl-request.dto.ts
│       │   └── web-crawl-response.dto.ts
│       ├── handlers/
│       │   ├── index.ts
│       │   └── web-crawl.handler.ts
│       └── rest.router.ts
├── application/
│   ├── ports/
│   │   ├── index.ts
│   │   ├── web-crawl-request.port.ts
│   │   ├── web-crawl-task-publisher.port.ts
│   │   └── metrics.port.ts
│   └── services/
│       ├── index.ts
│       ├── web-crawl-request.service.ts
│       └── application.factory.ts
├── common/
│   ├── utils/
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   ├── otel-init.ts
│   │   └── trace-context.utils.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── trace-context.type.ts
│   └── middleware/
│       ├── index.ts
│       └── trace-context.middleware.ts
├── config/
│   ├── index.ts
│   ├── kafka.ts
│   ├── observability.ts
│   └── server.ts
├── domain/
│   └── entities/
│       ├── index.ts
│       └── web-crawl-request.entity.ts
└── infrastructure/
    ├── messaging/
    │   └── kafka/
    │       ├── index.ts
    │       ├── web-crawl-task.publisher.ts
    │       └── kafka.factory.ts
    └── metrics/
        ├── index.ts
        └── prometheus-metrics.adapter.ts
```

### Step 2: Copy and Adapt Utilities from Task-Manager

#### 2.1 Copy Logger Utility
**Source**: `apps/task-manager/src/common/utils/logger.ts`
**Destination**: `apps/gateway/src/common/utils/logger.ts`

**Adaptations needed**:
- Update service name from 'task-manager' to 'gateway'
- Ensure all imports are compatible
- Verify logger configuration matches gateway requirements

**Testing requirements**:
- [ ] Logger initializes without errors
- [ ] Log levels work correctly (debug, info, warn, error)
- [ ] Structured logging format is maintained
- [ ] OpenTelemetry integration works

#### 2.2 Copy Validation Utility
**Source**: `apps/task-manager/src/common/utils/validation.ts`
**Destination**: `apps/gateway/src/common/utils/validation.ts`

**Adaptations needed**:
- Ensure class-validator and class-transformer imports are correct
- Verify validation patterns are compatible
- Update any service-specific validation logic

**Testing requirements**:
- [ ] DTO validation works correctly
- [ ] Error messages are properly formatted
- [ ] Validation decorators function as expected
- [ ] Type conversion works properly

#### 2.3 Copy OpenTelemetry Initialization
**Source**: `apps/task-manager/src/common/utils/otel-init.ts`
**Destination**: `apps/gateway/src/common/utils/otel-init.ts`

**Adaptations needed**:
- Update service name and version
- Configure for gateway-specific requirements
- Ensure trace context generation works for gateway as trace parent

**Testing requirements**:
- [ ] OpenTelemetry initializes without errors
- [ ] Resource attributes are set correctly
- [ ] Exporters are configured properly
- [ ] Trace context generation works

#### 2.4 Copy Configuration Patterns
**Source**: `apps/task-manager/src/config/`
**Destination**: `apps/gateway/src/config/`

**Files to copy and adapt**:
- Configuration structure and patterns
- Environment variable handling
- Type-safe configuration interfaces

**Testing requirements**:
- [ ] Configuration loads without errors
- [ ] Environment variables are validated
- [ ] Type-safe configuration objects work
- [ ] Default values are applied correctly

### Step 3: Update Package.json

#### 3.1 Review Current Dependencies
Check `apps/gateway/package.json` and identify:
- Unused dependencies that can be removed
- Missing dependencies that need to be added
- Version mismatches with workspace root

#### 3.2 Update Dependencies
Ensure the following dependencies are available (from workspace root):
```json
{
  "express": "^4.21.2",
  "class-validator": "^0.14.2",
  "class-transformer": "^0.5.1",
  "kafkajs": "^2.2.4",
  "uuid": "^11.1.0",
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-node": "^0.203.0",
  "@opentelemetry/auto-instrumentations-node": "^0.62.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.203.0",
  "@opentelemetry/resources": "^2.0.1",
  "@opentelemetry/semantic-conventions": "^1.36.0"
}
```

#### 3.3 Development Dependencies
Ensure these dev dependencies are available:
```json
{
  "@types/express": "^4.17.21",
  "@types/uuid": "^10.0.0",
  "jest": "^30.0.2",
  "supertest": "^7.1.4",
  "@nx/node": "21.3.7"
}
```

## Outputs

### Files Created
- Complete directory structure as specified above
- All utility files copied and adapted from task-manager
- Updated `package.json` with correct dependencies

### Files Modified
- `apps/gateway/package.json` - Updated dependencies
- `apps/gateway/tsconfig.json` - Verify TypeScript configuration
- `apps/gateway/jest.config.ts` - Verify Jest configuration

## Detailed Testing Criteria

### 1. Directory Structure Validation
- [ ] All directories exist in the correct locations
- [ ] Directory permissions are correct (readable/writable)
- [ ] No extra directories were created accidentally
- [ ] Directory structure matches clean architecture patterns

### 2. Utility Files Testing
- [ ] **Logger Utility**:
  - [ ] Logger initializes without errors
  - [ ] All log levels work (debug, info, warn, error)
  - [ ] Structured logging format is maintained
  - [ ] OpenTelemetry integration works
  - [ ] Service name is correctly set to 'gateway'

- [ ] **Validation Utility**:
  - [ ] DTO validation works correctly
  - [ ] Error messages are properly formatted
  - [ ] Validation decorators function as expected
  - [ ] Type conversion works properly
  - [ ] No TypeScript compilation errors

- [ ] **OpenTelemetry Initialization**:
  - [ ] OpenTelemetry initializes without errors
  - [ ] Resource attributes are set correctly
  - [ ] Exporters are configured properly
  - [ ] Trace context generation works
  - [ ] Service name and version are correct

### 3. Package.json Validation
- [ ] All required dependencies are listed
- [ ] No unused dependencies remain
- [ ] Version numbers match workspace root
- [ ] No version conflicts exist
- [ ] TypeScript compilation works with new dependencies

### 4. TypeScript Configuration
- [ ] `tsconfig.json` is properly configured
- [ ] All imports resolve correctly
- [ ] No TypeScript compilation errors
- [ ] Path mappings work if configured
- [ ] Strict mode settings are appropriate

### 5. Jest Configuration
- [ ] `jest.config.ts` is properly configured
- [ ] Test environment can be set up
- [ ] Test utilities can be imported
- [ ] Mock configurations work

### 6. Integration Testing
- [ ] All utilities can be imported and used together
- [ ] No circular dependency issues
- [ ] Module resolution works correctly
- [ ] Build process completes successfully

## Performance Requirements
- [ ] Directory creation completes in < 5 seconds
- [ ] Utility file copying completes in < 10 seconds
- [ ] Package.json updates don't cause dependency resolution issues
- [ ] TypeScript compilation completes in < 30 seconds

## Error Handling Requirements
- [ ] Graceful handling of missing source files
- [ ] Clear error messages for dependency conflicts
- [ ] Rollback capability if setup fails
- [ ] Validation of copied file integrity

## Documentation Requirements
- [ ] Document any adaptations made to copied utilities
- [ ] Note any version differences from task-manager
- [ ] Document directory structure decisions
- [ ] Create setup verification checklist

## Rollback Plan
If this job fails:
1. Remove all created directories
2. Restore original package.json
3. Document what failed and why
4. Create issue for investigation

## Success Criteria
- [ ] All directories exist and are accessible
- [ ] All utility files are copied and working
- [ ] Package.json has correct dependencies
- [ ] No TypeScript compilation errors
- [ ] All tests pass (if any exist)
- [ ] Documentation is updated
- [ ] Rollback plan is documented

## Estimated Time
**Total**: 2-3 hours
- Directory structure creation: 30 minutes
- Utility copying and adaptation: 1-1.5 hours
- Package.json updates: 30 minutes
- Testing and validation: 1 hour

## Dependencies for Next Job
This job must be completed before:
- Job 2: Configuration Management (needs directory structure)
- Job 3: OpenTelemetry Setup (needs utilities)
- All subsequent jobs (need basic structure)

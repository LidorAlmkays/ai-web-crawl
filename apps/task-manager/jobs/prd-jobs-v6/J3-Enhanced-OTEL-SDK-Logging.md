# Job 3: Enhance OTEL SDK Logging with Proper Labels and Severity

## Purpose

Use OTEL SDK properly to send structured logs with service name, severity, and custom labels for better observability and readability in Loki.

## Current Issues

- Manual OTLP log record creation
- No proper OTEL SDK usage
- Missing structured logging with labels
- Logs not optimized for Loki querying

## Project Structure Changes

### Files to Modify

#### 1. `apps/task-manager/src/common/utils/loggers/otel-logger.ts`

**Current State:**

```typescript
// Manual OTLP log record creation
const logRecord = {
  timestamp: Date.now() * 1000000,
  severityText: level.toUpperCase(),
  severityNumber: this.getSeverityNumber(level),
  body: { stringValue: message },
  attributes: Object.entries(metadata || {}).map(([key, value]) => ({
    key,
    value: { stringValue: String(value) },
  })),
  // ... manual configuration
};
```

**Changes:**

- Use OTEL SDK Logger API
- Implement proper Resource attributes
- Add structured logging with labels
- Use OTEL Severity API
- Remove manual log record creation

**New Implementation:**

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { LoggerProvider, Logger } from '@opentelemetry/sdk-logs';

export class OtelLogger implements LoggerInterface {
  private logger: Logger;
  private resource: Resource;

  constructor(serviceName: string) {
    // Create resource with service attributes
    this.resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
    });

    // Create logger provider with resource
    const loggerProvider = new LoggerProvider({
      resource: this.resource,
    });

    // Create logger instance
    this.logger = loggerProvider.getLogger('task-manager');
  }

  info(message: string, metadata?: any): void {
    this.logger.emit({
      severityText: 'INFO',
      severityNumber: 9,
      body: message,
      attributes: this.buildAttributes(metadata),
    });
  }

  private buildAttributes(metadata?: any): Record<string, any> {
    const baseAttributes = {
      'log.level': 'info',
      component: 'task-manager',
      timestamp: new Date().toISOString(),
    };

    if (metadata) {
      return { ...baseAttributes, ...metadata };
    }

    return baseAttributes;
  }
}
```

#### 2. `apps/task-manager/src/common/utils/otel-init.ts` (New File)

**Purpose:**

- Initialize OTEL SDK properly
- Configure resource attributes
- Set up logging provider

**Implementation:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPLogExporter } from '@opentelemetry/exporter-otlp-http';
import { LoggerProvider } from '@opentelemetry/sdk-logs';

export function initializeOtelLogging(): void {
  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Create logger provider
  const loggerProvider = new LoggerProvider({
    resource,
  });

  // Configure OTLP exporter
  const logExporter = new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/logs',
    headers: {},
  });

  // Register the exporter
  loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));

  // Set as global logger provider
  logs.setGlobalLoggerProvider(loggerProvider);
}
```

#### 3. `apps/task-manager/src/app.ts`

**Changes:**

- Import and call OTEL initialization
- Ensure proper startup order

**Code Changes:**

```typescript
import { initializeOtelLogging } from './common/utils/otel-init';

// In startup function
async function startApplication(): Promise<void> {
  // Initialize OTEL logging first
  initializeOtelLogging();

  // ... rest of startup code
}
```

### Files to Create

#### 1. `apps/task-manager/src/common/utils/otel-init.ts`

- OTEL SDK initialization
- Resource configuration
- Logger provider setup

#### 2. `apps/task-manager/src/common/types/otel.types.ts`

- OTEL-specific type definitions
- Log level enums
- Attribute interfaces

### Files to Update

#### 1. `package.json` (Workspace Root)

**Add Dependencies:**

```json
{
  "dependencies": {
    "@opentelemetry/sdk-logs": "^0.48.0",
    "@opentelemetry/resources": "^1.21.0",
    "@opentelemetry/semantic-conventions": "^1.21.0"
  }
}
```

## Implementation Steps

### Step 1: Install OTEL SDK Dependencies

1. Install required OTEL SDK packages
2. Update package.json
3. Run npm install

### Step 2: Create OTEL Initialization

1. Create `otel-init.ts` file
2. Implement proper resource configuration
3. Set up logger provider

### Step 3: Update OTEL Logger

1. Refactor `otel-logger.ts` to use SDK
2. Implement structured logging
3. Add proper attributes and labels

### Step 4: Update Application Startup

1. Import OTEL initialization in `app.ts`
2. Ensure proper startup order
3. Test logging functionality

### Step 5: Test Structured Logging

1. Generate logs with different levels
2. Verify structured format in Loki
3. Test label-based queries in Grafana

## Test Criteria

- ✅ Logs show proper service name and version
- ✅ Severity levels are correctly mapped
- ✅ Custom labels are searchable in Loki
- ✅ Logs are human-readable and well-structured
- ✅ No debug spam in console
- ✅ OTEL SDK is properly initialized

## Dependencies

- Job 1 (Cleanup) must be completed
- Job 2 (OTEL Collector → Loki) must be completed
- OTEL SDK packages must be installed

## Estimated Time

- 90 minutes

## Success Metrics

- Structured logs with proper labels
- Service attributes in Loki
- Severity-based filtering works
- Clean, maintainable OTEL SDK usage
- Ready for Job 4 (Distributed Tracing)

## Expected Log Format in Loki

```json
{
  "service.name": "task-manager",
  "service.version": "1.0.0",
  "service.instance.id": "hostname",
  "log.level": "info",
  "component": "task-manager",
  "message": "Task Manager starting up",
  "timestamp": "2025-08-11T18:00:00.000Z"
}
```

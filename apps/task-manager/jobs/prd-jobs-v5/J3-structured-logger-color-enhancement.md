# Job 3: OTEL Logger Simplification

## Overview

This job simplifies the OTEL logger to behave exactly like the simple logger but with additional OpenTelemetry collector integration. The OTEL logger should have identical console output to the simple logger while also forwarding all logs to the OTEL collector for observability.

## Objectives

1. **Mirror Simple Logger**: OTEL logger console output should be identical to simple logger
2. **Add OTEL Integration**: Forward all logs to OpenTelemetry collector
3. **Maintain Simplicity**: Keep the implementation simple without complex OTEL features
4. **Preserve Colors**: Maintain color support like simple logger

## Current State Analysis

### Existing OTEL Logger Issues

- Complex JSON output format
- Different console output from simple logger
- Over-engineered with trace context
- Not following the "same as simple logger" requirement

### Required Changes

- Simplify console output to match simple logger exactly
- Add basic OTEL collector integration
- Remove complex trace context handling
- Keep color support consistent

## Implementation Details

### 1. OTEL Logger Console Output

The OTEL logger should produce identical console output to the simple logger:

```typescript
// Simple Logger Output:
[INFO] [Task Manager] [2025-08-10T13:01:55.270Z]: Database connected successfully

// OTEL Logger Output (should be identical):
[INFO] [Task Manager] [2025-08-10T13:01:55.270Z]: Database connected successfully
```

### 2. OTEL Integration

Add minimal OTEL collector integration:

```typescript
import { trace, context } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

export class OtelLogger {
  private simpleLogger: SimpleLogger;
  private otelExporter: OTLPLogExporter;

  constructor(serviceName = 'Task Manager') {
    // Use simple logger for console output
    this.simpleLogger = new SimpleLogger(serviceName);

    // Initialize OTEL exporter
    this.otelExporter = new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/logs',
    });
  }

  info(message: string, meta?: any): void {
    // Console output (identical to simple logger)
    this.simpleLogger.info(message, meta);

    // Send to OTEL collector
    this.sendToOtel('info', message, meta);
  }

  private sendToOtel(level: string, message: string, meta?: any): void {
    try {
      const logRecord = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        service: this.serviceName,
        message,
        ...meta,
      };

      this.otelExporter.export([logRecord]);
    } catch (error) {
      // Don't let OTEL errors affect console logging
      console.error('OTEL export failed:', error);
    }
  }
}
```

### 3. Color Support

Maintain color support consistent with simple logger:

```typescript
// Use the same color constants as simple logger
const COLORS = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m', // Yellow
  info: '\x1b[36m', // Cyan
  debug: '\x1b[32m', // Green
  success: '\x1b[32m', // Green
  reset: '\x1b[0m', // Reset
};
```

### 4. Environment Configuration

Add OTEL-specific environment variables:

```bash
# OTEL Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/logs
OTEL_SERVICE_NAME=task-manager
OTEL_LOG_LEVEL=info
```

## Files to Modify

### 1. `src/common/utils/otel-logger.ts`

**Complete rewrite to match simple logger behavior:**

```typescript
import { SimpleLogger } from './simple-logger';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

export class OtelLogger {
  private simpleLogger: SimpleLogger;
  private otelExporter: OTLPLogExporter;
  private serviceName: string;

  constructor(serviceName = 'Task Manager') {
    this.serviceName = serviceName;

    // Use simple logger for console output
    this.simpleLogger = new SimpleLogger(serviceName);

    // Initialize OTEL exporter
    this.initializeOtelExporter();
  }

  private initializeOtelExporter(): void {
    try {
      this.otelExporter = new OTLPLogExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/logs',
      });
    } catch (error) {
      console.error('Failed to initialize OTEL exporter:', error);
      this.otelExporter = null;
    }
  }

  info(message: string, meta?: any): void {
    this.simpleLogger.info(message, meta);
    this.sendToOtel('info', message, meta);
  }

  error(message: string, meta?: any): void {
    this.simpleLogger.error(message, meta);
    this.sendToOtel('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.simpleLogger.warn(message, meta);
    this.sendToOtel('warn', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.simpleLogger.debug(message, meta);
    this.sendToOtel('debug', message, meta);
  }

  success(message: string, meta?: any): void {
    this.simpleLogger.success(message, meta);
    this.sendToOtel('success', message, meta);
  }

  private sendToOtel(level: string, message: string, meta?: any): void {
    if (!this.otelExporter) return;

    try {
      const logRecord = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        service: this.serviceName,
        message,
        ...meta,
      };

      this.otelExporter.export([logRecord]);
    } catch (error) {
      // Don't let OTEL errors affect console logging
      console.error('OTEL export failed:', error);
    }
  }

  // Convenience methods for backward compatibility
  logInfo = this.info.bind(this);
  logError = this.error.bind(this);
  logWarn = this.warn.bind(this);
  logDebug = this.debug.bind(this);
  logSuccess = this.success.bind(this);
}
```

### 2. `src/common/utils/logger-factory.ts`

**Update to remove structured logger references:**

```typescript
import { SimpleLogger } from './simple-logger';
import { OtelLogger } from './otel-logger';

export type LoggerType = 'simple' | 'otel';

// ... existing code ...

private createLogger(type: LoggerType): LoggerInterface {
  const serviceName = process.env.SERVICE_NAME || 'Task Manager';

  switch (type) {
    case 'simple':
      return new SimpleLogger(serviceName);
    case 'otel':
      return new OtelLogger(serviceName);
    default:
      // Default to simple logger
      return new SimpleLogger(serviceName);
  }
}

private getLoggerTypeFromEnv(): LoggerType {
  const logFormat = process.env.LOG_FORMAT?.toLowerCase();

  switch (logFormat) {
    case 'simple':
      return 'simple';
    case 'otel':
      return 'otel';
    default:
      // Default to simple logger
      return 'simple';
  }
}
```

### 3. `package.json`

**Add OTEL dependencies:**

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.48.0",
    "@opentelemetry/sdk-node": "^0.48.0"
  }
}
```

## Testing Strategy

### 1. Console Output Testing

```typescript
describe('OtelLogger', () => {
  it('should produce identical console output to SimpleLogger', () => {
    const simpleLogger = new SimpleLogger('Test Service');
    const otelLogger = new OtelLogger('Test Service');

    // Capture console output
    const simpleOutput = captureConsoleOutput(() => {
      simpleLogger.info('Test message');
    });

    const otelOutput = captureConsoleOutput(() => {
      otelLogger.info('Test message');
    });

    expect(otelOutput).toBe(simpleOutput);
  });
});
```

### 2. OTEL Integration Testing

```typescript
describe('OtelLogger OTEL Integration', () => {
  it('should send logs to OTEL collector', async () => {
    const otelLogger = new OtelLogger('Test Service');

    // Mock OTEL exporter
    const mockExport = jest.fn();
    otelLogger['otelExporter'] = { export: mockExport };

    otelLogger.info('Test message', { test: 'data' });

    expect(mockExport).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Test message',
        level: 'INFO',
        test: 'data',
      }),
    ]);
  });
});
```

### 3. Error Handling Testing

```typescript
describe('OtelLogger Error Handling', () => {
  it('should not fail when OTEL exporter is unavailable', () => {
    const otelLogger = new OtelLogger('Test Service');

    // Should not throw error
    expect(() => {
      otelLogger.info('Test message');
    }).not.toThrow();
  });
});
```

## Success Criteria

1. **Identical Console Output**: OTEL logger produces exactly the same console output as simple logger
2. **OTEL Integration**: Logs are successfully sent to OTEL collector
3. **Color Support**: Colors work consistently with simple logger
4. **Error Resilience**: OTEL failures don't affect console logging
5. **Performance**: No significant performance impact from OTEL integration

## Dependencies

- `@opentelemetry/api`: Core OTEL API
- `@opentelemetry/exporter-logs-otlp-http`: HTTP exporter for logs
- `@opentelemetry/sdk-node`: Node.js SDK

## Notes

- The OTEL logger is now simplified to focus on basic log forwarding
- Console output is delegated to the simple logger for consistency
- OTEL integration is minimal and doesn't affect console logging
- Error handling ensures OTEL failures don't break the application
- All existing logging calls remain compatible

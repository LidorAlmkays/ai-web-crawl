# Job 4: Integration and Global Export

## Overview

**Status**: ✅ **COMPLETED**  
**Dependency Level**: 3 (Depends on Job 3)  
**Duration**: 2-3 hours  
**Description**: Integrate the OTEL logger with application lifecycle and create global access points. This job wires the logger into the existing application startup/shutdown sequence and provides the global logger export for project-wide usage.

## Prerequisites

- ✅ Job 3 completed (OTEL logger implementation available)
- ✅ Understanding of application lifecycle
- ✅ Knowledge of TypeScript module systems

## Dependencies

**Requires**: Job 3 (OTEL Logger Implementation)  
**Blocks**: Jobs 5, 6

## Objectives

1. Create global logger export that works throughout the application
2. Integrate logger initialization with application startup sequence
3. Ensure proper initialization order: OTEL SDK → Logger → Application
4. Implement graceful shutdown with resource cleanup
5. Provide backward compatibility with existing logger usage

## Detailed Tasks

### Task 4.1: Create Global Logger Export

**Estimated Time**: 45 minutes

Replace the temporary logger with a proper global logger that uses the factory:

````typescript
// apps/task-manager/src/common/utils/logger.ts

import { LoggerFactory } from './logging';
import { ILogger } from './logging/interfaces';

/**
 * Global logger instance
 *
 * IMPORTANT: This logger requires initialization via LoggerFactory.initialize()
 * before use. Calling any method before initialization will throw an error.
 *
 * @example
 * ```typescript
 * // In app.ts
 * await LoggerFactory.getInstance().initialize();
 *
 * // Anywhere else in the application
 * import { logger } from '../utils/logger';
 * logger.info('Application started');
 * ```
 */
class GlobalLogger implements ILogger {
  private get instance(): ILogger {
    try {
      return LoggerFactory.getInstance().getLogger();
    } catch (error) {
      // Fallback to console if logger not initialized
      // This prevents crashes but indicates a configuration problem
      console.error('Logger not initialized, falling back to console:', error);
      return this.createFallbackLogger();
    }
  }

  /**
   * Create fallback logger for emergency use
   * Used when main logger fails to initialize
   */
  private createFallbackLogger(): ILogger {
    const timestamp = () => new Date().toISOString();

    return {
      info: (message: string, metadata?: Record<string, any>) => {
        console.log(`[level:info,service:task-manager,timestamp:${timestamp()}]:${message}`);
        if (metadata) console.log(JSON.stringify(metadata, null, 2));
      },
      warn: (message: string, metadata?: Record<string, any>) => {
        console.warn(`[level:warn,service:task-manager,timestamp:${timestamp()}]:${message}`);
        if (metadata) console.warn(JSON.stringify(metadata, null, 2));
      },
      error: (message: string, metadata?: Record<string, any>) => {
        console.error(`[level:error,service:task-manager,timestamp:${timestamp()}]:${message}`);
        if (metadata) console.error(JSON.stringify(metadata, null, 2));
      },
      debug: (message: string, metadata?: Record<string, any>) => {
        console.debug(`[level:debug,service:task-manager,timestamp:${timestamp()}]:${message}`);
        if (metadata) console.debug(JSON.stringify(metadata, null, 2));
      },
    };
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.instance.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.instance.warn(message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.instance.error(message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.instance.debug(message, metadata);
  }
}

// Export the global logger instance
export const logger = new GlobalLogger();

// Also export factory for advanced usage
export { LoggerFactory } from './logging';

// Export types for TypeScript users
export type { ILogger } from './logging/interfaces';
````

### Task 4.2: Find Current Application Structure

**Estimated Time**: 15 minutes

First, examine the current application structure to understand how to integrate:

```bash
# Check current app.ts structure
cat apps/task-manager/src/app.ts

# Check current server.ts structure
cat apps/task-manager/src/server.ts
```

### Task 4.3: Update Application Class

**Estimated Time**: 60 minutes

Integrate logger initialization into the application lifecycle:

```typescript
// apps/task-manager/src/app.ts
// Modify the existing TaskManagerApplication class

import { LoggerFactory } from './common/utils/logging';
import { logger } from './common/utils/logger';

// Add to the existing class or modify as needed:
export class TaskManagerApplication {
  private loggerFactory: LoggerFactory;
  // ... existing properties

  constructor() {
    this.loggerFactory = LoggerFactory.getInstance();
    // ... existing constructor code
  }

  /**
   * Initialize application components
   * Must be called before start() and after OTEL initialization
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize logger first (after OTEL SDK initialization)
      await this.loggerFactory.initialize();
      logger.info('Application initialization started', {
        service: 'task-manager',
        phase: 'initialization',
      });

      // Initialize other components...
      // ... existing initialization code (if any)

      logger.info('Application initialization completed');
    } catch (error) {
      // Use console.error since logger might not be available
      console.error('Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start application
   * Calls initialize() if not already done
   */
  public async start(): Promise<void> {
    try {
      // Ensure initialization is complete
      if (!this.loggerFactory.isInitialized()) {
        await this.initialize();
      }

      // Start application components
      // ... existing start logic

      logger.info('Application started successfully', {
        service: 'task-manager',
        phase: 'startup',
      });
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : String(error),
        phase: 'startup',
      });
      throw error;
    }
  }

  /**
   * Shutdown application gracefully
   * Ensures proper cleanup of all resources
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Application shutdown initiated', {
        service: 'task-manager',
        phase: 'shutdown',
      });

      // Shutdown other components first...
      // ... existing shutdown logic

      // Shutdown logger last (so we can log the shutdown process)
      await this.loggerFactory.shutdown();

      // Final message to console since logger is now shutdown
      console.info('Application shutdown completed');
    } catch (error) {
      console.error('Application shutdown failed:', error);
      throw error;
    }
  }

  // ... existing methods
}
```

### Task 4.4: Update Server Bootstrap

**Estimated Time**: 30 minutes

Update the server.ts to use proper initialization sequence:

```typescript
// apps/task-manager/src/server.ts

/**
 * Task Manager Service - Server Bootstrap
 *
 * This file is a thin server bootstrap that starts the Task Manager service
 * using the configured app instance from app.ts.
 *
 * Initialization order:
 * 1. OTEL SDK initialization
 * 2. Logger initialization (via app.initialize())
 * 3. Application startup
 * 4. Signal handlers for graceful shutdown
 */

import { initOpenTelemetry } from './common/utils/otel-init';
import { TaskManagerApplication } from './app';

async function bootstrap() {
  let app: TaskManagerApplication | null = null;

  try {
    // Step 1: Initialize OTEL first
    initOpenTelemetry();
    console.info('OpenTelemetry initialized successfully');

    // Step 2: Create and initialize application (which initializes logger)
    app = new TaskManagerApplication();
    await app.start(); // This calls initialize() internally

    // Step 3: Setup graceful shutdown handlers
    setupShutdownHandlers(app);

    console.info('Task Manager service is running');
  } catch (error) {
    console.error('Failed to bootstrap Task Manager application:', error);

    // Attempt graceful shutdown even on startup failure
    if (app) {
      try {
        await app.shutdown();
      } catch (shutdownError) {
        console.error('Error during emergency shutdown:', shutdownError);
      }
    }

    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupShutdownHandlers(app: TaskManagerApplication) {
  const shutdown = async (signal: string) => {
    console.info(`${signal} received, shutting down gracefully`);

    try {
      await app.shutdown();
      console.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

// Start the bootstrap process
bootstrap();
```

### Task 4.5: Update Package.json Scripts

**Estimated Time**: 10 minutes

Ensure the start scripts work with the new logger:

```json
// Verify these scripts exist in apps/task-manager/package.json:
{
  "scripts": {
    "serve": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "build": "tsc"
    // ... other scripts
  }
}
```

### Task 4.6: Test Integration

**Estimated Time**: 20 minutes

Create integration test to verify the complete flow:

```typescript
// apps/task-manager/src/test-integration.ts
// (Remove after testing)

import { initOpenTelemetry } from './common/utils/otel-init';
import { TaskManagerApplication } from './app';
import { logger } from './common/utils/logger';

async function testIntegration() {
  console.log('=== Testing OTEL Logger Integration ===');

  try {
    // 1. Initialize OTEL
    console.log('1. Initializing OTEL...');
    initOpenTelemetry();

    // 2. Create and start application
    console.log('2. Creating application...');
    const app = new TaskManagerApplication();

    console.log('3. Starting application...');
    await app.start();

    // 3. Test logger functionality
    console.log('4. Testing logger...');
    logger.info('Integration test message', {
      test: true,
      timestamp: new Date().toISOString(),
    });

    logger.warn('Test warning');
    logger.error('Test error', { error: 'This is a test error' });
    logger.debug('Test debug message');

    // 4. Wait for async processing
    console.log('5. Waiting for async processing...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Shutdown
    console.log('6. Shutting down...');
    await app.shutdown();

    console.log('=== Integration test completed successfully ===');
  } catch (error) {
    console.error('=== Integration test failed ===', error);
    process.exit(1);
  }
}

// Run the test
testIntegration();
```

## Validation Criteria

### ✅ Technical Validation

1. **Application Starts**: Server boots without logger-related errors
2. **Initialization Order**: OTEL → Logger → Application sequence works
3. **Global Logger**: `logger` export works throughout application
4. **Graceful Shutdown**: Resources cleaned up properly on exit
5. **Error Handling**: Failures don't crash the application

### ✅ Functional Validation

1. **Console Output**: Logs appear in correct format immediately
2. **OTEL Integration**: Logs sent to collector (if running)
3. **Existing Code**: All current `logger.info()` calls work unchanged
4. **Signal Handling**: SIGTERM/SIGINT cause graceful shutdown
5. **Fallback Behavior**: Works even if OTEL collector unavailable

## Testing Instructions

### Manual Testing

```bash
cd apps/task-manager

# Build the application
npm run build

# Test the integration (optional)
node dist/test-integration.js

# Start the application normally
npm run serve

# In another terminal, test graceful shutdown
kill -TERM <pid>
# or
curl -X POST localhost:3000/shutdown  # if you have a shutdown endpoint
```

### Expected Console Output

```
OpenTelemetry initialized successfully
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Application initialization started
{
  "service": "task-manager",
  "phase": "initialization"
}
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Application started successfully
{
  "service": "task-manager",
  "phase": "startup"
}
Task Manager service is running
```

## Deliverables

- [ ] **Global Logger**: Works throughout application without initialization errors
- [ ] **Application Integration**: Logger properly integrated into lifecycle
- [ ] **Startup Sequence**: Correct order (OTEL → Logger → App)
- [ ] **Shutdown Handling**: Graceful cleanup with proper signal handling
- [ ] **Backward Compatibility**: Existing logger usage continues working
- [ ] **Error Resilience**: Fallback behavior when logger fails

## Dependencies for Next Jobs

**Enables**:

- Job 5: Testing and Validation (can test full integration)
- Job 6: Documentation and Migration (application ready for production)

**Blocks**: Jobs 5, 6 need working integration

## Troubleshooting

### Common Issues

1. **Logger Not Initialized Error**

   - Solution: Ensure `app.initialize()` called before using logger
   - Check OTEL initialization happens first
   - Verify no circular dependencies

2. **Application Won't Start**

   - Solution: Check for TypeScript compilation errors
   - Verify all imports resolve correctly
   - Test with temporary console.log statements

3. **Graceful Shutdown Fails**

   - Solution: Check async/await usage in shutdown methods
   - Ensure all resources have proper cleanup
   - Add timeout for shutdown operations

4. **Global Logger Fallback**
   - Solution: Indicates factory not initialized properly
   - Check application startup sequence
   - Verify no errors during logger initialization

### Debug Mode

Add this to test initialization issues:

```typescript
// Add to app.ts for debugging
console.log('Logger factory state:', this.loggerFactory.getState());
console.log('Logger factory config:', this.loggerFactory.getConfig());
```

## Notes

- 🔄 **Lifecycle**: Proper initialization and shutdown order is critical
- 🌐 **Global Access**: Logger available everywhere after initialization
- 🛡️ **Resilience**: Fallback behavior prevents crashes
- 🧪 **Testable**: Clear separation makes testing easier
- 📋 **Compatibility**: Existing code continues working unchanged

## Ready for Next Job

Upon completion, Job 5 (Testing and Validation) can test the complete integrated system.

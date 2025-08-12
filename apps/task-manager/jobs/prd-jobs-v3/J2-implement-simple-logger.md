# Job 2: Implement Simple Logger with Color-Coded Output

## Objective

Create a simple, development-friendly logger that outputs clean, color-coded messages in the format `*[date]:message*` while preserving the existing structured logger for production use.

## Problem Analysis

Current logging format is too verbose for development:

```
[level:ERROR,service:Task Manager,timestamp:2025-08-07 19:09:52]:Failed to create web crawl task
```

Need a simpler format for development debugging while keeping structured format for OTEL integration.

## Solution

### 1. Simple Logger Format

**Format**: `*[date]:message*`

- `*` = Color-coded severity indicator (emoji)
- `[date]` = ISO timestamp
- `message` = Human-readable message

**Color Scheme**:

- 🔴 **ERROR**: Red color
- 🟡 **INFO**: Yellow color
- 🔵 **DEBUG**: Blue color
- 🟢 **SUCCESS**: Green color
- ⚪ **WARN**: White color

### 2. Logger Architecture

```
Logger Interface
    ↓
Logger Factory
    ↓
[LOG_FORMAT=simple] → Simple Logger → Console (colored)
[LOG_FORMAT=structured] → Structured Logger → Console + Files
```

## Implementation

### 1. Create Simple Logger

**File**: `src/common/utils/simple-logger.ts`

```typescript
import chalk from 'chalk';

export interface SimpleLogger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}

export class SimpleLoggerImpl implements SimpleLogger {
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    const color = this.getColor(level);

    let formattedMessage = `${emoji}[${timestamp}]:${message}`;

    if (meta) {
      formattedMessage += ` ${JSON.stringify(meta)}`;
    }

    return color(formattedMessage);
  }

  private getEmoji(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
        return '🔴';
      case 'info':
        return '🟡';
      case 'debug':
        return '🔵';
      case 'success':
        return '🟢';
      case 'warn':
        return '⚪';
      default:
        return '⚪';
    }
  }

  private getColor(level: string): (text: string) => string {
    switch (level.toLowerCase()) {
      case 'error':
        return chalk.red;
      case 'info':
        return chalk.yellow;
      case 'debug':
        return chalk.blue;
      case 'success':
        return chalk.green;
      case 'warn':
        return chalk.white;
      default:
        return chalk.white;
    }
  }

  error(message: string, meta?: any): void {
    console.log(this.formatMessage('error', message, meta));
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  debug(message: string, meta?: any): void {
    console.log(this.formatMessage('debug', message, meta));
  }

  success(message: string, meta?: any): void {
    console.log(this.formatMessage('success', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.log(this.formatMessage('warn', message, meta));
  }
}
```

### 2. Create Structured Logger Wrapper

**File**: `src/common/utils/structured-logger.ts`

```typescript
import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

export interface StructuredLogger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}

export class StructuredLoggerImpl implements StructuredLogger {
  private logger: Logger;

  constructor() {
    const { combine, timestamp, printf } = format;

    const taskManagerFormat = printf((info) => {
      const metaString = Object.keys(info).length > 3 ? ` ${JSON.stringify(info)}` : '';
      return `[level:${info.level.toUpperCase()},service:Task Manager,timestamp:${info.timestamp}]:${info.message}${metaString}`;
    });

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), taskManagerFormat),
      transports: [
        new transports.Console({
          format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), taskManagerFormat),
        }),
        new transports.File({
          filename: 'logs/task-manager-error.log',
          level: 'error',
          format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), taskManagerFormat),
        }),
        new transports.File({
          filename: 'logs/task-manager-combined.log',
          format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), taskManagerFormat),
        }),
      ],
    });
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  success(message: string, meta?: any): void {
    this.logger.info(message, meta); // Winston doesn't have success level
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }
}
```

### 3. Create Logger Factory

**File**: `src/common/utils/logger-factory.ts`

```typescript
import { SimpleLogger, SimpleLoggerImpl } from './simple-logger';
import { StructuredLogger, StructuredLoggerImpl } from './structured-logger';

export interface ILogger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}

export class LoggerFactory {
  private static instance: ILogger;

  static getLogger(): ILogger {
    if (!LoggerFactory.instance) {
      const logFormat = process.env.LOG_FORMAT || 'simple';

      if (logFormat === 'simple') {
        LoggerFactory.instance = new SimpleLoggerImpl();
      } else {
        LoggerFactory.instance = new StructuredLoggerImpl();
      }
    }

    return LoggerFactory.instance;
  }

  static resetLogger(): void {
    LoggerFactory.instance = undefined as any;
  }
}
```

### 4. Update Main Logger

**File**: `src/common/utils/logger.ts`

```typescript
import { LoggerFactory, ILogger } from './logger-factory';

// Export the logger instance
export const logger: ILogger = LoggerFactory.getLogger();

// Convenience methods for backward compatibility
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logError = (message: string, meta?: any) => logger.error(message, meta);
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);
export const logSuccess = (message: string, meta?: any) => logger.success(message, meta);
```

### 5. Add Configuration

**File**: `src/config/logging.ts`

```typescript
export interface LoggingConfig {
  level: string;
  format: 'simple' | 'structured';
  colors: boolean;
}

export const loggingConfig: LoggingConfig = {
  level: process.env.LOG_LEVEL || 'debug',
  format: (process.env.LOG_FORMAT as 'simple' | 'structured') || 'simple',
  colors: process.env.LOG_COLORS !== 'false',
};
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install chalk
npm install --save-dev @types/chalk
```

### Step 2: Create Logger Files

1. Create `simple-logger.ts`
2. Create `structured-logger.ts`
3. Create `logger-factory.ts`
4. Update `logger.ts`

### Step 3: Update Configuration

1. Create `logging.ts` config file
2. Update environment variables
3. Update app configuration

### Step 4: Update Usage

1. Replace all logger imports
2. Update any custom logging calls
3. Test both logging formats

### Step 5: Test Logging

1. Test simple logger format
2. Test structured logger format
3. Test color output
4. Test environment variable switching

## Files to Create/Modify

### New Files

- `src/common/utils/simple-logger.ts`
- `src/common/utils/structured-logger.ts`
- `src/common/utils/logger-factory.ts`
- `src/config/logging.ts`

### Modified Files

- `src/common/utils/logger.ts`
- `package.json` (add chalk dependency)

## Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=simple  # 'simple' or 'structured'
LOG_COLORS=true    # Enable/disable color output
```

## Example Output

### Simple Logger

```
🔴[2025-08-10T10:17:12.123Z]:Failed to create web crawl task - invalid enum value
🟡[2025-08-10T10:17:12.124Z]:Processing new task message
🔵[2025-08-10T10:17:12.125Z]:Executing create_web_crawl_task procedure
🟢[2025-08-10T10:17:12.126Z]:Task created successfully
```

### Structured Logger (unchanged)

```
[level:ERROR,service:Task Manager,timestamp:2025-08-10 10:17:12]:Failed to create web crawl task
[level:INFO,service:Task Manager,timestamp:2025-08-10 10:17:12]:Processing new task message
```

## Success Criteria

- [ ] Simple logger outputs clean, color-coded messages
- [ ] Structured logger preserves current format
- [ ] Environment variable controls logging format
- [ ] Color output works correctly
- [ ] No performance degradation
- [ ] Backward compatibility maintained

## Testing

1. **Unit Tests**: Test logger implementations
2. **Integration Tests**: Test with application
3. **Format Tests**: Test both logging formats
4. **Color Tests**: Test color output
5. **Performance Tests**: Verify no performance impact

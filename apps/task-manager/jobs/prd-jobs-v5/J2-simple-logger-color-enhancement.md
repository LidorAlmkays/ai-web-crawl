# Job 2: Simple Logger Color Enhancement

## Objective

Enhance the simple logger with proper color support and improve message formatting for better readability.

## Current State Analysis

- Simple logger has basic formatting but no colors
- Uses winston for logging but lacks visual distinction
- Message format is functional but not visually appealing
- No environment-based color configuration

## Requirements

### 1. Color Support Implementation

- **Error Level**: Red color for errors
- **Warn Level**: Yellow color for warnings
- **Info Level**: Cyan color for info messages
- **Debug Level**: Green color for debug messages
- **Success Level**: Green color for success messages
- **Color Disable**: Support for disabling colors via environment variable

### 2. Message Formatting Improvements

- **Consistent Format**: `[LEVEL] [SERVICE] [TIMESTAMP]: MESSAGE`
- **Color Coding**: Each level has distinct color
- **Meta Data**: Optional metadata in JSON format
- **Timestamp**: ISO format with timezone

### 3. Environment-Based Configuration

- **Color Toggle**: `LOG_COLORS` environment variable
- **Fallback**: Graceful fallback when colors not supported
- **Terminal Detection**: Detect if terminal supports colors

## Implementation Details

### Files to Modify:

1. `src/common/utils/simple-logger.ts`

### Key Changes:

#### Color Support:

```typescript
// Add color constants
private static readonly COLORS = {
  error: '\x1b[31m',   // Red
  warn: '\x1b[33m',    // Yellow
  info: '\x1b[36m',    // Cyan
  debug: '\x1b[32m',   // Green
  success: '\x1b[32m', // Green
  reset: '\x1b[0m',    // Reset
} as const;

// Add color detection
private isColorSupported(): boolean {
  // Check if colors are disabled via environment
  if (process.env.LOG_COLORS === 'false') {
    return false;
  }

  // Check if terminal supports colors
  return process.stdout.isTTY && process.env.TERM !== 'dumb';
}

// Add color helper method
private getColorForLevel(level: string): string {
  if (!this.isColorSupported()) {
    return '';
  }

  const color = SimpleLogger.COLORS[level as keyof typeof SimpleLogger.COLORS];
  return color || '';
}

// Add reset color helper
private getResetColor(): string {
  if (!this.isColorSupported()) {
    return '';
  }
  return SimpleLogger.COLORS.reset;
}
```

#### Enhanced Message Formatting:

```typescript
// Update formatMessage method
private formatMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const color = this.getColorForLevel(level);
  const reset = this.getResetColor();

  // Format metadata if present
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

  // Build formatted message
  const formattedMessage = `${color}[${levelUpper}] [${this.serviceName}] [${timestamp}]: ${message}${metaStr}${reset}`;

  return formattedMessage;
}
```

#### Winston Integration:

```typescript
// Update winston format to include colors
private createWinstonLogger(): any {
  try {
    const winston = require('winston');

    const logFormat = winston.format.printf(
      ({ level, message, timestamp, service, ...meta }: any) => {
        const timestampStr = timestamp || new Date().toISOString();
        const serviceStr = service || this.serviceName;
        const color = this.getColorForLevel(level);
        const reset = this.getResetColor();
        const levelUpper = level.toUpperCase();

        // Format metadata
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

        return `${color}[${levelUpper}] [${serviceStr}] [${timestampStr}]: ${message}${metaStr}${reset}`;
      }
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        logFormat
      ),
      defaultMeta: { service: this.serviceName },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/task-manager-error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/task-manager-combined.log',
        }),
      ],
    });
  } catch (error) {
    // Fallback to console logging if Winston is not available
    return null;
  }
}
```

#### Constructor Updates:

```typescript
constructor(serviceName = 'Task Manager') {
  this.serviceName = serviceName;
  this.logger = this.createWinstonLogger();
}
```

## Testing Requirements

### Unit Tests:

1. Test color support detection
2. Test color formatting for each log level
3. Test color disable functionality
4. Test message formatting with and without metadata
5. Test fallback behavior when winston unavailable

### Integration Tests:

1. Test color output in different terminal environments
2. Test log level filtering with colors
3. Test metadata formatting
4. Test timestamp formatting

## Success Criteria

1. **Color Support**: All log levels have distinct colors
2. **Environment Awareness**: Colors respect LOG_COLORS setting
3. **Fallback Support**: Graceful handling when colors not supported
4. **Message Format**: Consistent and readable message format
5. **Metadata Support**: Proper JSON formatting of metadata
6. **Performance**: No performance impact from color support

## Environment Variables

```bash
# Color Configuration
LOG_COLORS=true                      # Enable colors (default)
LOG_COLORS=false                     # Disable colors
LOG_LEVEL=info                       # Set log level
```

## Example Output

### With Colors Enabled:

```
[INFO] [Task Manager] [2025-08-10T13:01:55.270Z]: Database connected successfully
[DEBUG] [Task Manager] [2025-08-10T13:02:09.765Z]: Message processing details {"taskId": "task-123"}
[ERROR] [Task Manager] [2025-08-10T13:02:09.809Z]: Validation failed {"field": "taskId", "value": null}
```

### With Colors Disabled:

```
[INFO] [Task Manager] [2025-08-10T13:01:55.270Z]: Database connected successfully
[DEBUG] [Task Manager] [2025-08-10T13:02:09.765Z]: Message processing details {"taskId": "task-123"}
[ERROR] [Task Manager] [2025-08-10T13:02:09.809Z]: Validation failed {"field": "taskId", "value": null}
```

## Dependencies

- No new external dependencies
- Uses existing winston configuration
- Maintains backward compatibility
- Uses ANSI color codes for terminal compatibility

## Estimated Time

**0.5 days** - Color enhancement and message formatting improvements




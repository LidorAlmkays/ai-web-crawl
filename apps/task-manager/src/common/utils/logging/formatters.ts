import { LogLevel } from './types';
import { LogRecord } from './interfaces';

/**
 * Console output formatter that creates logs in the format:
 * [level:X,service:Y,timestamp:Z]:message
 * with metadata as JSON on a new line
 */
export class ConsoleFormatter {
  /**
   * Format a log record for console output
   * @param record - The log record to format
   * @returns Formatted string ready for console output
   */
  static format(record: LogRecord): string {
    const { level, service, timestamp, message, metadata, traceId, spanId } =
      record;

    // Build the prefix parts
    const parts = [
      `level:${level}`,
      `service:${service}`,
      `timestamp:${timestamp}`,
    ];

    // Add trace context if available
    if (traceId) {
      parts.push(`trace:${traceId}`);
    }
    if (spanId) {
      parts.push(`span:${spanId}`);
    }

    // Create the main log line
    let output = `[${parts.join(',')}]:${message}`;

    // Add metadata as JSON on a new line if present
    if (metadata && Object.keys(metadata).length > 0) {
      try {
        output += `\n${JSON.stringify(metadata, null, 2)}`;
      } catch (error) {
        // Fallback if metadata can't be serialized
        output += `\n{"metadata_serialization_error": "${
          error instanceof Error ? error.message : 'Unknown error'
        }"}`;
      }
    }

    return output;
  }

  /**
   * Get the appropriate console method for the log level
   * Single output strategy - direct process output for nx serve compatibility
   * @param level - The log level
   * @returns Console method function
   */
  static getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    // Single output strategy - direct process output works perfectly with nx serve
    switch (level) {
      case 'error':
        return (...args) => {
          const output = args.join(' ');
          process.stderr.write(output + '\n');
        };
      case 'warn':
        return (...args) => {
          const output = args.join(' ');
          process.stdout.write(output + '\n');
        };
      case 'debug':
        return (...args) => {
          const output = args.join(' ');
          process.stdout.write(output + '\n');
        };
      case 'info':
      default:
        return (...args) => {
          const output = args.join(' ');
          process.stdout.write(output + '\n');
        };
    }
  }
}

/**
 * OTEL log record formatter that converts our LogRecord to OTEL format
 */
export class OTELFormatter {
  /**
   * Convert LogRecord to OTEL log record format
   * @param record - The log record to convert
   * @returns OTEL-compatible log record
   */
  static toOTELLogRecord(record: LogRecord): any {
    const otelRecord: any = {
      timestamp: Date.parse(record.timestamp) * 1000000, // Convert to nanoseconds
      severityNumber: this.getSeverityNumber(record.level),
      severityText: record.level.toUpperCase(),
      body: record.message,
      attributes: {
        'service.name': record.service,
        ...record.metadata,
      },
    };

    // Add trace context if available
    if (record.traceId) {
      otelRecord.traceId = record.traceId;
    }
    if (record.spanId) {
      otelRecord.spanId = record.spanId;
    }

    return otelRecord;
  }

  /**
   * Map log level to OTEL severity number
   * @param level - The log level
   * @returns OTEL severity number
   */
  private static getSeverityNumber(level: LogLevel): number {
    switch (level) {
      case 'debug':
        return 5; // DEBUG
      case 'info':
        return 9; // INFO
      case 'warn':
        return 13; // WARN
      case 'error':
        return 17; // ERROR
      default:
        return 9; // Default to INFO
    }
  }
}

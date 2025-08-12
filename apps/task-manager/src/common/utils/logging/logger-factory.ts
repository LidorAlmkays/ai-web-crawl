import { ILogger, LoggerConfig } from './interfaces';
import { LoggerState, LoggerError, LoggerErrorType } from './types';
import { createLoggerConfig } from './config';
import { OTELLogger } from './otel-logger';

/**
 * Singleton factory for managing logger instances
 * Ensures single logger instance across application with proper lifecycle management
 */
export class LoggerFactory {
  private static instance: LoggerFactory | null = null;
  private logger: ILogger | null = null;
  private config: LoggerConfig | null = null;
  private state: LoggerState = LoggerState.UNINITIALIZED;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Intentionally empty - singleton pattern
  }

  /**
   * Get singleton instance of LoggerFactory
   * Creates instance on first call, returns same instance on subsequent calls
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Initialize logger with configuration
   * Must be called before using the logger
   * @param config - Logger configuration (optional, will use environment if not provided)
   */
  public async initialize(config?: LoggerConfig): Promise<void> {
    if (this.state === LoggerState.READY) {
      return; // Already initialized, no-op
    }

    if (this.state === LoggerState.INITIALIZING) {
      throw new LoggerError(
        'Logger initialization already in progress',
        LoggerErrorType.INITIALIZATION_FAILED
      );
    }

    try {
      this.state = LoggerState.INITIALIZING;

      // Use provided config or create from environment variables
      this.config = config || createLoggerConfig();

      // Configuration validation is handled in createLoggerConfig()

      // Create logger instance
      this.logger = new OTELLogger(this.config);

      this.state = LoggerState.READY;

      // Logger initialization logged by global logger wrapper
    } catch (error) {
      this.state = LoggerState.ERROR;
      const loggerError = new LoggerError(
        'Failed to initialize logger',
        LoggerErrorType.INITIALIZATION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );

      // Fallback to console logging for error reporting
      console.error('Logger initialization failed:', loggerError.message);
      if (loggerError.cause) {
        console.error('Caused by:', loggerError.cause.message);
      }
      throw loggerError;
    }
  }

  /**
   * Get logger instance
   * @throws {LoggerError} If logger is not initialized
   */
  public getLogger(): ILogger {
    if (this.state !== LoggerState.READY || !this.logger) {
      throw new LoggerError(
        'Logger not initialized. Call initialize() first.',
        LoggerErrorType.INITIALIZATION_FAILED
      );
    }

    return this.logger;
  }

  /**
   * Check if logger is initialized and ready for use
   */
  public isInitialized(): boolean {
    return this.state === LoggerState.READY && this.logger !== null;
  }

  /**
   * Get current logger state
   */
  public getState(): LoggerState {
    return this.state;
  }

  /**
   * Get current configuration (null if not initialized)
   */
  public getConfig(): LoggerConfig | null {
    return this.config;
  }

  /**
   * Shutdown logger and cleanup resources
   * Should be called during application shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.state === LoggerState.SHUTDOWN) {
      return; // Already shutdown, no-op
    }

    try {
      this.state = LoggerState.SHUTDOWN;

      // Call shutdown on logger if it supports it
      if (this.logger && 'shutdown' in this.logger) {
        await (this.logger as any).shutdown();
      }

      this.logger = null;
      this.config = null;

      console.info('Logger shutdown completed');
    } catch (error) {
      const loggerError = new LoggerError(
        'Failed to shutdown logger',
        LoggerErrorType.SHUTDOWN_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );

      console.error('Logger shutdown failed:', loggerError.message);
      throw loggerError;
    }
  }

  /**
   * Reset factory state (for testing purposes)
   * @internal Only use in tests
   */
  public static reset(): void {
    LoggerFactory.instance = null;
  }
}

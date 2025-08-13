/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, blocking requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close circuit */
  resetTimeout: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;
}

/**
 * Circuit breaker for OTEL operations
 * Prevents cascade failures when OTEL collector is unavailable
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Function to execute
   * @returns Promise that resolves to function result or rejects if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - OTEL unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return now - this.lastFailureTime >= this.config.resetTimeout;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Check if circuit breaker allows execution
   */
  isCallAllowed(): boolean {
    return (
      this.state === CircuitBreakerState.CLOSED ||
      (this.state === CircuitBreakerState.OPEN && this.shouldAttemptReset())
    );
  }
}





/**
 * Task Manager Service - Server Bootstrap
 *
 * This file is a thin server bootstrap that starts the Task Manager service
 * using the configured app instance from app.ts.
 *
 * It handles signal processing and graceful shutdown.
 */

// CRITICAL: Import reflect-metadata first for decorators to work
import 'reflect-metadata';

// CRITICAL: Initialize OpenTelemetry synchronously before any other imports
// This ensures instrumentation works properly for express, kafkajs, and pg
const { initOpenTelemetry } = require('./common/utils/otel-init');
initOpenTelemetry();

import { TaskManagerApplication } from './app';
import { logger, initializeLogger } from './common/utils/logger';

/**
 * Bootstrap function that initializes and starts the Task Manager application
 *
 * This function orchestrates the complete application startup sequence:
 * 1. Preserves original console methods to prevent OTEL hijacking
 * 2. Initializes OpenTelemetry for observability
 * 3. Initializes the logger system
 * 4. Restores console methods if needed
 * 5. Creates and starts the TaskManagerApplication
 *
 * The function handles critical initialization order to ensure proper
 * logging and observability setup before application startup.
 *
 * @throws Error - When OTEL initialization fails
 * @throws Error - When logger initialization fails
 * @throws Error - When application startup fails
 *
 * @example
 * ```typescript
 * // This function is called automatically when the module is loaded
 * bootstrap();
 * ```
 */
async function bootstrap() {
  // Preserve console methods before any nx/otel hijacking
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  // OTEL is already initialized at the top of this file
  // Initialize logger after OTEL
  await initializeLogger();

  // Restore console methods if needed
  Object.assign(console, originalConsole);

  const app = new TaskManagerApplication();
  try {
    await app.start();
    logger.debug('Task Manager application started successfully');
  } catch (error) {
    logger.error('Failed to bootstrap Task Manager application', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

bootstrap();

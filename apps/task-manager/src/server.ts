/**
 * Task Manager Service - Server Layer
 *
 * RESPONSIBILITY: Process lifecycle management
 * 
 * This layer is responsible for:
 * - Signal handling (SIGINT, SIGTERM) for graceful shutdown
 * - OpenTelemetry initialization and shutdown
 * - Process exit coordination
 * - Logging process-level events
 * 
 * This layer is NOT responsible for:
 * - Business logic
 * - Dependency injection
 * - Resource management (databases, message queues)
 * - Service startup logic
 * 
 * PATTERN: All services should follow this server/app separation pattern
 * where server.ts handles process concerns and app.ts handles business concerns.
 */

// CRITICAL: Import reflect-metadata first for decorators to work
import 'reflect-metadata';

// CRITICAL: Initialize OpenTelemetry synchronously before any other imports
// This ensures instrumentation works properly for express, kafkajs, and pg
import { TaskManagerApplication } from './app';
import { initOpenTelemetry } from './common/utils/otel-init';
import { logger } from './common/utils/logger';

/**
 * Bootstrap the Task Manager application
 */
async function bootstrap() {
  try {
    logger.info('Starting Task Manager server bootstrap');
    
    // Initialize OpenTelemetry first
    logger.info('Initializing OpenTelemetry');
    initOpenTelemetry();
    logger.info('OpenTelemetry initialized successfully');
    
    // Create and start the application
    logger.info('Creating Task Manager application');
    const app = new TaskManagerApplication();
    
    logger.info('Starting Task Manager application');
    await app.start();
    logger.info('Task Manager application started successfully');
    logger.info('Server is ready and running');
    
  } catch (error) {
    logger.error('Failed to bootstrap Task Manager application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the application
bootstrap();

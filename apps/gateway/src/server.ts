import 'reflect-metadata';
import { Application } from './app';
import { logger } from './common/utils/logger';

/**
 * Bootstrap function to start the gateway service
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting Gateway service');

    // Create and start the application
    const app = new Application();
    await app.initialize();
    await app.start();

    logger.info('Gateway service started successfully');
  } catch (error) {
    logger.error('Failed to start Gateway service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the application
bootstrap();

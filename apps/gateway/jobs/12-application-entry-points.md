# Job 12: Application Entry Points

## Objective
Create main application entry points that wire up all components, handle dependency injection, graceful shutdown, and provide a clean bootstrap process.

## Prerequisites
- Job 11: API Router completed
- All components implemented
- Configuration management working
- Infrastructure adapters ready

## Inputs
- All implemented services and adapters
- Configuration system
- Router and middleware
- Error handling setup

## Detailed Implementation Steps

### Step 1: Create Main Application Class
```typescript
// src/app.ts
import express from 'express';
import { configuration } from './config';
import { initializeOpenTelemetry } from './common/utils/otel-init';
import { logger } from './common/utils/logger';
import { ApplicationFactory } from './application/services/application.factory';
import { KafkaFactory } from './infrastructure/messaging/kafka/kafka.factory';
import { KafkaWebCrawlTaskPublisher } from './infrastructure/messaging/kafka/web-crawl-task.publisher';
import { LocalMetricsAdapter } from './infrastructure/metrics/local-metrics.adapter';
import { WebCrawlHandler } from './api/rest/handlers/web-crawl.handler';
import { HealthCheckHandler } from './api/rest/handlers/health-check.handler';
import { RestRouter } from './api/rest/rest.router';

export class Application {
  private app: express.Application;
  private server: any;
  private kafkaFactory: KafkaFactory;
  private metrics: LocalMetricsAdapter;
  private webCrawlHandler!: WebCrawlHandler;
  private healthCheckHandler!: HealthCheckHandler;
  private restRouter!: RestRouter;

  constructor() {
    this.app = express();
    this.kafkaFactory = KafkaFactory.getInstance();
    this.metrics = new LocalMetricsAdapter();
    this.setupApplication();
  }

  private setupApplication(): void {
    const config = configuration.getConfig();

    // Initialize OpenTelemetry
    initializeOpenTelemetry();

    // Setup middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Setup application services
    this.setupServices();

    // Setup routes
    this.setupRoutes();

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  private setupServices(): void {
    const appFactory = ApplicationFactory.getInstance();

    // Create Kafka publisher
    const kafkaPublisher = new KafkaWebCrawlTaskPublisher(this.kafkaFactory);

    // Create web crawl request service
    const webCrawlRequestService = appFactory.createWebCrawlRequestService(
      kafkaPublisher,
      this.metrics
    );

    // Create handlers
    this.webCrawlHandler = new WebCrawlHandler(webCrawlRequestService, this.metrics);
    this.healthCheckHandler = new HealthCheckHandler();

    // Create REST router
    this.restRouter = new RestRouter(
      this.webCrawlHandler,
      this.healthCheckHandler,
      this.metrics
    );

    logger.info('Application services setup completed');
  }

  private setupRoutes(): void {
    // Mount REST API routes
    this.app.use('/', this.restRouter.getRouter());

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(this.metrics.getMetricsData());
    });

    logger.info('Application routes setup completed');
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        await this.stop();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      this.stop().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      this.stop().then(() => process.exit(1));
    });
  }

  public async start(): Promise<void> {
    try {
      const config = configuration.getConfig();

      // Start HTTP server
      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info('Gateway service started successfully', {
          port: config.server.port,
          host: config.server.host,
          environment: config.environment,
        });
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('Server error', { error });
        throw error;
      });

    } catch (error) {
      logger.error('Failed to start gateway service', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      logger.info('Stopping gateway service...');

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Disconnect Kafka
      await this.kafkaFactory.disconnect();

      logger.info('Gateway service stopped successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}
```

### Step 2: Create Server Bootstrap
```typescript
// src/server.ts
import 'reflect-metadata';
import { Application } from './app';
import { logger } from './common/utils/logger';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting Gateway service');

    // Create and start the application
    const app = new Application();
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
```

### Step 3: Create Development Server
```typescript
// src/dev-server.ts
import 'reflect-metadata';
import { Application } from './app';
import { logger } from './common/utils/logger';

async function startDevelopmentServer(): Promise<void> {
  try {
    logger.info('Starting Gateway service in development mode');

    // Enable development features
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'debug';

    // Create and start the application
    const app = new Application();
    await app.start();

    logger.info('Development server started successfully');

    // Hot reload setup (if needed)
    if (module.hot) {
      module.hot.accept('./app', () => {
        logger.info('Hot reload triggered');
      });
    }
  } catch (error) {
    logger.error('Failed to start development server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the development server
startDevelopmentServer();
```

### Step 4: Create Health Check Integration
```typescript
// src/health/health-manager.ts
import { IMetricsPort } from '../application/ports/metrics.port';
import { KafkaFactory } from '../infrastructure/messaging/kafka/kafka.factory';
import { logger } from '../common/utils/logger';

export class HealthManager {
  constructor(
    private readonly metrics: IMetricsPort,
    private readonly kafkaFactory: KafkaFactory
  ) {}

  async getHealthStatus(): Promise<any> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        service: await this.checkService(),
        kafka: await this.checkKafka(),
        metrics: await this.checkMetrics(),
      },
    };

    const isHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = isHealthy ? 'healthy' : 'unhealthy';

    return health;
  }

  private async checkService(): Promise<any> {
    try {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.APP_VERSION || '1.0.0',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkKafka(): Promise<any> {
    try {
      // Basic Kafka connectivity check
      const kafka = this.kafkaFactory.getKafka();
      const admin = kafka.admin();
      
      // This is a lightweight check
      await admin.connect();
      await admin.disconnect();

      return {
        status: 'healthy',
        message: 'Kafka connection successful',
      };
    } catch (error) {
      logger.warn('Kafka health check failed', { error });
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Kafka connection failed',
      };
    }
  }

  private async checkMetrics(): Promise<any> {
    try {
      const metricsData = this.metrics.getMetricsData();
      return {
        status: 'healthy',
        data: metricsData,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Metrics unavailable',
      };
    }
  }
}
```

### Step 5: Create Environment Setup
```typescript
// src/env.ts
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';

export function setupEnvironment(): void {
  // Load environment variables from .env file
  const envPath = join(process.cwd(), '.env');
  dotenvConfig({ path: envPath });

  // Set default values if not provided
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.APP_NAME = process.env.APP_NAME || 'gateway';
  process.env.APP_VERSION = process.env.APP_VERSION || '1.0.0';
  process.env.APP_PORT = process.env.APP_PORT || '3002';
  
  // Validate required environment variables
  const required = ['APP_PORT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

## Outputs
- `src/app.ts`
- `src/server.ts`
- `src/dev-server.ts`
- `src/health/health-manager.ts`
- `src/env.ts`
- Complete application bootstrap process

## Testing Criteria

### Application Tests
- [ ] Application starts successfully
- [ ] All dependencies wired correctly
- [ ] Configuration loading works
- [ ] Services initialized properly
- [ ] Routes mounted correctly

### Integration Tests
- [ ] Full application startup
- [ ] HTTP server responds
- [ ] All endpoints accessible
- [ ] Graceful shutdown works
- [ ] Error scenarios handled

### Health Check Tests
- [ ] Health endpoint responds
- [ ] All health checks execute
- [ ] Unhealthy states detected
- [ ] Health status accurate

### Bootstrap Tests
- [ ] Server starts without errors
- [ ] Environment validation works
- [ ] Missing config handled
- [ ] Shutdown signals handled
- [ ] Resource cleanup works

## Performance Requirements
- Startup time: < 5 seconds
- Memory usage: < 100MB at startup
- Graceful shutdown: < 10 seconds
- Health check response: < 1 second

## Error Handling
- Missing configuration → fail fast with clear message
- Service startup failure → log and exit
- Dependency injection failure → fail fast
- Shutdown timeout → force exit after timeout
- Health check failure → return appropriate status

## Success Criteria
- [ ] Application starts successfully
- [ ] All components wired correctly
- [ ] HTTP server responds to requests
- [ ] Health checks work properly
- [ ] Graceful shutdown functions
- [ ] Performance requirements met
- [ ] Error handling comprehensive
- [ ] Logging provides good visibility

## Rollback Plan
If implementation fails:
1. Use simple Express server setup
2. Remove complex dependency injection
3. Document startup issues
4. Fix service wiring problems

## Notes
- Ensure proper dependency injection order
- Handle all startup error scenarios
- Implement comprehensive health checks
- Plan for graceful shutdown
- Monitor startup performance
- Add adequate logging for debugging
- Consider containerization requirements
- Plan for multiple environment support

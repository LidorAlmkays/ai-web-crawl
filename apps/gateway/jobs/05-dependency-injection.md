# Job 5: Dependency Injection and Startup

**PRD Reference**: 3.8
**Status**: Pending

## Objective

To wire together all the application components using dependency injection in `app.ts` and to bootstrap the application in `server.ts`. This phase brings all the previously defined layers together into a runnable application.

## Tasks

### 1. Refactor `app.ts` for Dependency Injection

- **File to Edit**: `apps/gateway/src/app.ts`
- **Action**: Completely overhaul the file to serve as the application's composition root. It will instantiate all services, use cases, and adapters, and inject them into their respective dependents.
- **Code Snippet**:

  ```typescript
  import config from './config';
  import { logger } from './common/utils/logger';
  import { KafkaClientService } from './common/clients/kafka-client';
  import { HashGeneratorService } from './application/services/hash-generator.service';
  import { KafkaCrawlRequestPublisherAdapter } from './infrastructure/kafka/send-crawl-request.adapter';
  import { HandleWebscrapeUseCase } from './application/use-cases/handle-webscrape.use-case';
  import { WebscrapeHandler } from './api/websocket/webscrape.handler';
  import { WebSocketServerManager } from './api/websocket/websocket.server';

  // Main application container
  export class Application {
    private kafkaClient: KafkaClientService;
    private webSocketServer: WebSocketServerManager;

    constructor() {
      // Instantiate core services
      this.kafkaClient = new KafkaClientService();
      const hashGenerator = new HashGeneratorService();

      // Instantiate infrastructure adapters
      const crawlRequestPublisher = new KafkaCrawlRequestPublisherAdapter(this.kafkaClient);

      // Instantiate application use cases
      const handleWebscrapeUseCase = new HandleWebscrapeUseCase(crawlRequestPublisher, hashGenerator);

      // Instantiate API handlers
      const webscrapeHandler = new WebscrapeHandler(handleWebscrapeUseCase);

      // Instantiate API servers
      this.webSocketServer = new WebSocketServerManager(config.server.websocketPort, webscrapeHandler.handle.bind(webscrapeHandler));

      logger.info('Application dependencies initialized');
    }

    public async start(): Promise<void> {
      await this.kafkaClient.connect();
      logger.info('Application startup complete');
      // The WebSocket server starts automatically in its constructor.
    }

    public async stop(): Promise<void> {
      logger.info('Stopping application...');
      await this.kafkaClient.disconnect();
      this.webSocketServer.close();
      logger.info('Application stopped');
    }
  }
  ```

### 2. Verify `server.ts`

- **File to Edit**: `apps/gateway/src/server.ts`
- **Action**: Ensure that `server.ts` correctly bootstraps the newly refactored `Application` class. The existing `server.ts` is likely correct and may not need changes.
- **Verification**: The application should start without any dependency injection errors when you run `npm run serve`.

## Verification

- The application must start successfully using `npm run serve` (or your equivalent start script).
- An end-to-end test (to be defined in a later job) will be the ultimate verification for this wiring.

## Next Step

This is the final implementation job. The next phase will be **Testing**.

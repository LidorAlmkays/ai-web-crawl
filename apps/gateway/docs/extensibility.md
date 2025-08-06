# Extensibility Guide

One of the primary benefits of the Hexagonal Architecture is its inherent extensibility. The clear separation between the application core and the infrastructure makes it straightforward to add new functionality or change existing components without causing a ripple effect across the codebase.

This guide provides step-by-step instructions for common extension scenarios.

## Scenario 1: Adding a New API Endpoint

Let's say we want to add a new WebSocket endpoint that allows clients to check the status of a crawl request by its ID.

### Step 1: Define the DTO

First, we need to define the Data Transfer Object (DTO) for the incoming message payload.

- **Create a new file**: `src/api/websocket/dtos/get-crawl-status.dto.ts`
- **Define the class**:

  ```typescript
  import { IsUUID } from 'class-validator';

  export class GetCrawlStatusDto {
    @IsUUID()
    crawlId: string;
  }
  ```

### Step 2: Define the Port

Next, we define a new port (interface) in the application layer that describes the business logic.

- **Edit the file**: `src/application/ports/webscrape.port.ts` (or create a new port file if more appropriate)
- **Add the new method to the interface**:

  ```typescript
  export interface IWebScrapePort {
    submit(request: IWebScrapeRequest): Promise<void>;
    getStatus(crawlId: string): Promise<CrawlStateEntity>; // New method
  }
  ```

### Step 3: Implement the Service

Now, we implement the new method in the corresponding service.

- **Edit the file**: `src/application/services/webscrape.service.ts`
- **Implement the `getStatus` method**:

  ```typescript
  import { CrawlStateEntity } from '../../domain/entities/crawl-state.entity';

  // ...

  export class WebScrapeService implements IWebScrapePort {
    // ... existing methods

    async getStatus(crawlId: string): Promise<CrawlStateEntity> {
      this.logger.log(`Fetching status for crawl ID: ${crawlId}`);
      const crawlState = await this.crawlStateRepository.getById(crawlId);
      if (!crawlState) {
        throw new Error('Crawl request not found');
      }
      return crawlState;
    }
  }
  ```

### Step 4: Create the Handler

We need a handler to process the incoming WebSocket message and call the application service.

- **Create a new file**: `src/api/websocket/handlers/get-crawl-status.handler.ts`
- **Define the handler**:

  ```typescript
  import { IWebsocketHandler } from '../../../common/types';
  import { GetCrawlStatusDto } from '../dtos/get-crawl-status.dto';
  import { IWebScrapePort } from '../../../application/ports/webscrape.port.ts';

  export class GetCrawlStatusHandler implements IWebsocketHandler {
    constructor(private readonly webScrapeService: IWebScrapePort) {}

    async handle(payload: GetCrawlStatusDto, clientId: string): Promise<any> {
      const status = await this.webScrapeService.getStatus(payload.crawlId);
      // We might want to send the status back to the client here
      return { event: 'crawl_status', data: status };
    }
  }
  ```

### Step 5: Update the Router

Finally, we need to update the WebSocket router to recognize the new message type and route it to our new handler.

- **Edit the file**: `src/api/websocket/routes.ts`
- **Add the new route**:

  ```typescript
  import { GetCrawlStatusHandler } from './handlers/get-crawl-status.handler';

  // ...

  export const getWebSocketRoutes = (
    webScrapeService: IWebScrapePort
    // ...
  ) => {
    const routes = new Map();
    routes.set('webscrape', new WebScrapeHandler(webScrapeService));
    routes.set('get_status', new GetCrawlStatusHandler(webScrapeService)); // New route
    return routes;
  };
  ```

### Step 6: Wire Dependencies

Ensure that any new dependencies are correctly injected in the composition root (`src/app.ts`). In this case, no new dependencies were added, so no changes are needed.

## Scenario 2: Changing a Persistence Adapter

Imagine we want to switch from Redis to MongoDB for storing the crawl state.

### Step 1: Implement the New Adapter

First, we need to create a new adapter that implements the `ICrawlStateRepositoryPort` interface but uses MongoDB as the backend.

- **Create a new directory**: `src/infrastructure/persistence/mongo/`
- **Create a new file**: `src/infrastructure/persistence/mongo/crawl-state.repository.adapter.ts`
- **Implement the adapter**:

  ```typescript
  import { ICrawlStateRepositoryPort } from '../../../ports/crawl-state-repository.port';
  import { CrawlStateEntity } from '../../../../domain/entities/crawl-state.entity';
  // ... import MongoDB client and models

  export class MongoCrawlStateRepositoryAdapter implements ICrawlStateRepositoryPort {
    async create(state: CrawlStateEntity): Promise<void> {
      // MongoDB implementation
    }

    async update(state: CrawlStateEntity): Promise<void> {
      // MongoDB implementation
    }

    async getById(id: string): Promise<CrawlStateEntity | null> {
      // MongoDB implementation
    }
  }
  ```

### Step 2: Update the Composition Root

The final step is to update the composition root (`src/app.ts`) to use our new adapter instead of the Redis one.

- **Edit the file**: `src/app.ts`
- **Change the dependency injection**:

  ```typescript
  // ... imports
  // import { RedisCrawlStateRepositoryAdapter } from './infrastructure/persistence/redis/crawl-state.repository.adapter';
  import { MongoCrawlStateRepositoryAdapter } from './infrastructure/persistence/mongo/crawl-state.repository.adapter';

  // ...

  // const crawlStateRepository = new RedisCrawlStateRepositoryAdapter(redisClient);
  const crawlStateRepository = new MongoCrawlStateRepositoryAdapter(/* mongoClient */);

  // ...
  ```

That's it! No changes were required in the application core. The business logic remains completely unaware of the underlying database technology, demonstrating the power and flexibility of the hexagonal architecture.

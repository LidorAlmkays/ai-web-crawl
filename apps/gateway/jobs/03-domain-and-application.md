# Job 3: Domain and Application Layer

**PRD Reference**: 3.4, 3.5
**Status**: Pending

## Objective

To define the core business logic, domain models, and application-layer interfaces (ports). This is the heart of the application, independent of any external frameworks.

## Tasks

### 1. Define Domain Model

- **File to Create**: `apps/gateway/src/domain/models/webscrape-event.model.ts`
- **Action**: Create a type alias for our core domain event.
- **Code Snippet**:

  ```typescript
  import { IWebscrapeRequest } from '../../common/types';

  export type WebscrapeEvent = IWebscrapeRequest;
  ```

### 2. Define Application Ports

- **File to Create**: `apps/gateway/src/application/ports/crawl-request-publisher.port.ts`
- **Content**:

  ```typescript
  export interface ICrawlRequestPublisher {
    publish(data: { hash: string; query: string; url: string }): Promise<void>;
  }
  ```

- **File to Create**: `apps/gateway/src/application/ports/webscrape-use-case.port.ts`
- **Content**:

  ```typescript
  import { WebscrapeEvent } from '../../domain/models/webscrape-event.model';

  export interface IWebscrapeUseCase {
    execute(event: WebscrapeEvent): Promise<void>;
  }
  ```

### 3. Implement Hash Generator Service

- **File to Create**: `apps/gateway/src/application/services/hash-generator.service.ts`
- **Action**: Implement the hashing logic using Node.js's `crypto` module.
- **Code Snippet**:

  ```typescript
  import * as crypto from 'crypto';

  export class HashGeneratorService {
    generate(query: string, url: string): string {
      const data = `${query}:${url}`;
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }
  ```

### 4. Implement Webscrape Use Case

- **File to Create**: `apps/gateway/src/application/use-cases/handle-webscrape.use-case.ts`
- **Action**: Create the use case that orchestrates the business logic.
- **Code Snippet**:

  ```typescript
  import { IWebscrapeUseCase } from '../ports/webscrape-use-case.port';
  import { ICrawlRequestPublisher } from '../ports/crawl-request-publisher.port';
  import { HashGeneratorService } from '../services/hash-generator.service';
  import { WebscrapeEvent } from '../../domain/models/webscrape-event.model';
  import { logger } from '../../common/utils/logger';

  export class HandleWebscrapeUseCase implements IWebscrapeUseCase {
    constructor(private readonly crawlRequestPublisher: ICrawlRequestPublisher, private readonly hashGenerator: HashGeneratorService) {}

    async execute(event: WebscrapeEvent): Promise<void> {
      const { query, url } = event;
      const hash = this.hashGenerator.generate(query, url);

      logger.info('Generated hash and preparing to publish crawl request', { query, url, hash });

      await this.crawlRequestPublisher.publish({ hash, query, url });

      logger.info('Successfully published crawl request', { hash });
    }
  }
  ```

## Verification

- All files should be created in their respective directories.
- The code should compile without errors.
- Unit tests should be written for `hash-generator.service.ts` and `handle-webscrape.use-case.ts` (as per a future job).

## Next Step

Proceed to **Job 4** once all tasks are completed and verified.

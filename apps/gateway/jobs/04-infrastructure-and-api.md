# Job 4: Infrastructure and API Layer

**PRD Reference**: 3.6, 3.7
**Status**: Pending

## Objective

To implement the components that interact with external systems. This includes the Kafka adapter for message publishing and the WebSocket server for receiving client requests.

## Tasks

### 1. Implement Kafka Publisher Adapter

- **File to Create**: `apps/gateway/src/infrastructure/kafka/send-crawl-request.adapter.ts`
- **Action**: Create the adapter that implements the `ICrawlRequestPublisher` port.
- **Code Snippet**:

  ```typescript
  import { ICrawlRequestPublisher } from '../../application/ports/crawl-request-publisher.port';
  import { KafkaClientService } from '../../common/clients/kafka-client';
  import config from '../../config';
  import { logger } from '../../common/utils/logger';

  export class KafkaCrawlRequestPublisherAdapter implements ICrawlRequestPublisher {
    private producer;

    constructor(private readonly kafkaClient: KafkaClientService) {
      this.producer = this.kafkaClient.getProducer();
    }

    async publish(data: { hash: string; query: string; url: string }): Promise<void> {
      const message = {
        key: data.hash,
        value: JSON.stringify(data),
      };

      await this.producer.send({
        topic: config.kafka.topics.crawlRequestTopic,
        messages: [message],
      });

      logger.info('Message sent to Kafka', { topic: config.kafka.topics.crawlRequestTopic, key: data.hash });
    }
  }
  ```

### 2. Implement WebSocket Server

- **File to Create**: `apps/gateway/src/api/websocket/websocket.server.ts`
- **Action**: Implement the WebSocket server for handling connections.
- **Code Snippet**:

  ```typescript
  import { WebSocketServer, WebSocket } from 'ws';
  import { logger } from '../../common/utils/logger';

  export class WebSocketServerManager {
    private wss: WebSocketServer;

    constructor(port: number, private messageHandler: (socket: WebSocket, message: Buffer) => void) {
      this.wss = new WebSocketServer({ port });
      this.initialize();
    }

    private initialize(): void {
      this.wss.on('connection', (ws: WebSocket) => {
        logger.info('WebSocket client connected');
        ws.on('message', (message: Buffer) => {
          this.messageHandler(ws, message);
        });
        ws.on('close', () => {
          logger.info('WebSocket client disconnected');
        });
        ws.on('error', (error) => {
          logger.error('WebSocket error', { error: error.message });
        });
      });
      logger.info(`WebSocket server started on port ${this.wss.options.port}`);
    }

    public close(): void {
      this.wss.close();
    }
  }
  ```

### 3. Implement WebSocket Message Handler

- **File to Create**: `apps/gateway/src/api/websocket/webscrape.handler.ts`
- **Action**: Implement the handler for `webscrape` messages.
- **Code Snippet**:

  ```typescript
  import { WebSocket } from 'ws';
  import { IWebscrapeUseCase } from '../../application/ports/webscrape-use-case.port';
  import { IWebscrapeRequest } from '../../common/types';
  import { logger } from '../../common/utils/logger';
  import { validateDto } from '../../common/utils/validation';
  import { SubmitCrawlRequestDto } from '../../infrastructure/api/rest/dtos/submit-crawl-request.dto';

  export class WebscrapeHandler {
    constructor(private readonly useCase: IWebscrapeUseCase) {}

    public async handle(socket: WebSocket, message: Buffer): Promise<void> {
      try {
        const data: IWebscrapeRequest = JSON.parse(message.toString());

        const validationResult = await validateDto(SubmitCrawlRequestDto, data);
        if (!validationResult.isValid) {
          logger.error('Invalid webscrape request payload', { errors: validationResult.errorMessage });
          socket.send(JSON.stringify({ error: 'Invalid payload', details: validationResult.errorMessage }));
          return;
        }

        logger.info('Received webscrape event', { query: data.query, url: data.url });
        await this.useCase.execute(data);
        socket.send(JSON.stringify({ status: 'Request received and is being processed.' }));
      } catch (error) {
        logger.error('Error processing WebSocket message', { error: error instanceof Error ? error.message : 'Unknown error' });
        socket.send(JSON.stringify({ error: 'Failed to process request.' }));
      }
    }
  }
  ```

## Verification

- All files should be created in their specified locations.
- The code should compile without errors.
- Integration tests should be written in a future job to verify the adapters work correctly with their respective services (Kafka, WebSocket).

## Next Step

Proceed to **Job 5** once all tasks are completed and verified.

# Architecture

## Overview

The Gateway Service is built upon a **Hexagonal Architecture**, also known as the **Ports and Adapters** pattern. This architectural choice is deliberate, aiming to create a system that is decoupled, testable, and maintainable. By separating the core business logic from the infrastructure and external dependencies, we can evolve the application without being tied to specific technologies.

The core principle is to create a clear boundary between the application's inside (the business logic) and its outside (the infrastructure). This is achieved through the use of ports and adapters.

## Core Concepts

### 1. The Hexagon (Application Core)

The heart of our application is the hexagon, which contains all the business logic. It is completely isolated from the outside world and has no knowledge of the specific technologies used for databases, messaging, or APIs.

- **Domain Entities**: These are the core business objects of the application, representing the fundamental concepts and their relationships. Examples include `CrawlStateEntity` and `CrawlRequestEntity`. They are located in `src/domain/entities/`.
- **Application Ports**: These are interfaces that define the contract for how the application core interacts with the outside world. They are the "ports" of the hexagon. We define both inbound ports (for driving the application) and outbound ports (for connecting to external services). They are located in `src/application/ports/`.
- **Application Services**: These are the concrete implementations of the inbound ports. They contain the core application logic and orchestrate the domain entities to perform business operations. They are located in `src/application/services/`.

### 2. Ports

Ports are the gateways to the application core. They are defined as interfaces and dictate the terms of interaction.

- **Inbound Ports**: These define how external actors can interact with the application. For example, the `IWebScrapePort` defines the contract for submitting a crawl request.
- **Outbound Ports**: These define how the application interacts with external services. For example, the `ICrawlStateRepositoryPort` defines the contract for persisting crawl state, and the `ICrawlRequestPublisherPort` defines the contract for publishing a crawl request.

### 3. Adapters

Adapters are the bridge between the application core and the external world. They are the concrete implementations of the ports and are responsible for translating between the application's internal representation and the external technology's format.

- **Inbound Adapters**: These adapt incoming requests from the outside world to calls on the application's inbound ports.
  - `WebsocketRouter` (`src/api/websocket/websocket.router.ts`): Receives WebSocket messages and routes them to the appropriate handler.
  - `CrawlResponseConsumer` (`src/api/kafka/crawl-response.consumer.ts`): Consumes messages from a Kafka topic and triggers the corresponding application service.
- **Outbound Adapters**: These adapt calls from the application's outbound ports to interactions with external services.
  - `RedisCrawlStateRepositoryAdapter` (`src/infrastructure/persistence/redis/crawl-state.repository.adapter.ts`): Implements the `ICrawlStateRepositoryPort` and persists data to a Redis database.
  - `KafkaCrawlRequestPublisherAdapter` (`src/infrastructure/messaging/kafka/crawl-request.publisher.adapter.ts`): Implements the `ICrawlRequestPublisherPort` and publishes messages to a Kafka topic.
  - `WebsocketUserNotificationAdapter` (`src/infrastructure/notification/websocket/user-notification.adapter.ts`): Implements the `IUserNotificationPort` and sends notifications to clients via WebSockets.

## Architectural Diagram

The following diagram illustrates the flow of control and data within the Gateway Service:

```
+------------------------------------------------------------------------------------------------+
|                                        Gateway Service                                         |
|                                                                                                |
| +--------------------------------+      +---------------------------------------------------+  |
| |       Application Core         |      |                  Infrastructure                   |  |
| |       (The Hexagon)            |      |                                                   |  |
| |                                |      |  +---------------------------------------------+  |  |
| | +----------------------------+ |      |  |             Inbound Adapters                |  |  |
| | |       Domain Entities      | |      |  |                                             |  |  |
| | | - CrawlStateEntity         | |      |  |  +----------------+   +-------------------+  |  |  |
| | | - CrawlRequestEntity       | |      |  |  | WebSocket API  |   |    Kafka Consumer   |  |  |
| | +----------------------------+ |      |  |  +----------------+   +-------------------+  |  |  |
| |                                |      |  |       |                      |                |  |  |
| | +----------------------------+ |      |  |       v                      v                |  |  |
| | |      Application Ports     | |<-----+--+---------------------------------------------+  |  |
| | | - IWebScrapePort           | |      |                                                   |  |  |
| | | - IProcessCrawlResponsePort| |      |  +---------------------------------------------+  |  |  |
| | | - ICrawlStateRepositoryPort| |      |  |             Outbound Adapters               |  |  |
| | | - IUserNotificationPort    | |      |  |                                             |  |  |
| | +----------------------------+ |      |  |       ^                      ^                |  |  |
| |                                |      |  |       |                      |                |  |  |
| | +----------------------------+ |      |  |  +----------------+   +-------------------+  |  |  |
| | |   Application Services     | |----->+--+  |   Redis DB     |   |   Kafka Producer  |  |  |
| | | - WebScrapeService         | |      |  |  +----------------+   +-------------------+  |  |  |
| | | - ProcessCrawlResponseSvc  | |      |  |                                             |  |  |
| | +----------------------------+ |      |  +---------------------------------------------+  |  |
| |                                |      |                                                   |  |  |
| +--------------------------------+      +---------------------------------------------------+  |
|                                                                                                |
+------------------------------------------------------------------------------------------------+
```

## Benefits of this Architecture

- **Decoupling**: The application core is completely independent of the infrastructure. This allows us to change the database, messaging queue, or any other external service without affecting the business logic.
- **Testability**: Since the business logic is isolated, it can be tested in-memory without the need for a database or other external services. This makes unit testing fast and reliable.
- **Maintainability**: The clear separation of concerns makes the codebase easier to understand, navigate, and maintain.
- **Flexibility**: The "pluggable" nature of the adapters makes it easy to add new features or change existing ones. For example, we could add a REST API as another inbound adapter without modifying the core application.
- **Technology Agnostic**: The application core is not tied to any specific technology. This gives us the freedom to choose the best tools for the job.

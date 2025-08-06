## Project Requirements Document: Gateway Service

This document outlines the detailed requirements for the "Gateway" service, a TypeScript project adhering to the Clean Architecture principles.

---

## 1. Project Overview

The Gateway service will act as an entry point for user-initiated web scraping requests. It will receive `webscrape` events containing a `query` string and a `URL`. Upon reception, the service will process this data, generate a unique hash, publish a crawl request to Kafka, and subsequently consume the crawl response from Kafka. The project emphasizes a strict separation of concerns through Clean Architecture, ensuring maintainability, testability, and framework independence.

---

## 2. Architecture and File Structure

The project will strictly follow the Clean Architecture paradigm, organizing code into four primary layers: `api`, `application`, `domain`, and `infrastructure`. A `common` folder will house cross-cutting concerns, and a `config` folder will manage application configurations.

### 2.1 Core Structure

gateway/
├── api/
├── application/
├── domain/
├── infrastructure/
├── common/
├── config/
├── app.ts
├── server.ts
├── package.json
├── tsconfig.json
└── README.md

### 2.2 Layered Breakdown and File Details

#### 2.2.1 `api/` Layer

**Purpose:** Responsible for receiving external data, validating it, and calling the appropriate `port` in the application layer. It also includes consumers for asynchronous events.

**Structure:**

api/
├── websocket/
│ └── webscrape.handler.ts
└── kafka/
└── crawl-response.consumer.ts

**File Descriptions:**

- **`api/kafka/crawl-response.consumer.ts`**:
  - **Job**: Listens to the `crawl-response` Kafka topic for completed job notifications.
  - **Dependencies**: `IProcessCrawlResponsePort`.
  - **Logic**: On message receipt, it calls the `process-crawl-response` service in the application layer with the `hash` and `result`.

---

#### 2.2.2 `application/` Layer

**Purpose:** Contains framework-independent business logic. It defines `ports` for business operations and provides `services` that implement them.

**Structure:**

application/
├── ports/
│ ├── hash.port.ts
│ ├── webscrape.port.ts
│ └── process-crawl-response.port.ts
└── services/
├── sha256-hash.service.ts
├── webscrape.service.ts
└── process-crawl-response.service.ts

**File Descriptions:**

- **`application/services/webscrape.service.ts`**:

  - **Job**: Implements `IWebscrapePort`.
  - **Dependencies**: `IHashPort`, `ICrawlStateRepositoryPort`, `ICrawlRequestPublisherPort`.
  - **Logic**: Generates a hash, **persists the request state** (hash and connection ID), and publishes the crawl request.

- **`application/services/process-crawl-response.service.ts`**:
  - **Job**: Implements `IProcessCrawlResponsePort`.
  - **Dependencies**: `ICrawlStateRepositoryPort`, `IUserNotificationPort`.
  - **Logic**: Receives a completed job's hash and result, **retrieves the original connection ID** from the state repository, and uses the notification port to send the result to the correct user.

---

#### 2.2.3 `domain/` Layer

**Purpose:** Contains core business entities.

**Structure:**

domain/
└── entities/
├── crawl-request.entity.ts
└── crawl-state.entity.ts

---

#### 2.2.4 `infrastructure/` Layer

**Purpose:** Contains technology-specific implementations (adapters) of ports.

**Structure:**

infrastructure/
├── ports/
│ ├── crawl-request-publisher.port.ts
│ ├── crawl-state-repository.port.ts
│ └── user-notification.port.ts
├── messaging/
│ └── kafka/
│ └── crawl-request.publisher.adapter.ts
├── persistence/
│ └── memory/
│ └── crawl-state.repository.adapter.ts
└── notification/
└── websocket/
└── user-notification.adapter.ts

**File Descriptions:**

- **`infrastructure/ports/crawl-state-repository.port.ts`**: Defines the contract for saving and retrieving the state of a crawl request (e.g., `save(state)`, `findByHash(hash)`).
- **`infrastructure/persistence/memory/crawl-state.repository.adapter.ts`**: An in-memory implementation of the state repository.
- **`infrastructure/ports/user-notification.port.ts`**: Defines the contract for sending a notification to a specific user connection (e.g., `send(connectionId, message)`).
- **`infrastructure/notification/websocket/user-notification.adapter.ts`**: Implements the notification port using the `WebSocketServerManager`.

---

#### 2.2.5 `common/` Folder

**Purpose:** Houses utilities, shared types, and client setups that are used across multiple layers.

**Structure:**

common/
├── utils/
│ └── logger.ts // Centralized logging utility.
│ └── validation.ts // Common validation helpers.
├── clients/
│ ├── kafka-client.ts // Common Kafka client instantiation and connection management.
│ └── websocket-server.ts // Centralized WebSocket server instance and connection management.
└── types/
└── index.ts // Shared TypeScript interfaces/types.

---

#### 2.2.6 `config/` Folder

**Purpose:** Manages all application configurations.

---

#### 2.2.7 Root Files

- **`app.ts`**:
  - **Job**: The **Composition Root**. This is where the application is assembled. It instantiates the concrete `services` (from `application`) and `adapters` (from `infrastructure`) and injects them where required, wiring up the application.
  - **Why**: Centralizes dependency management. This is where the "programmer" decides _which_ concrete class to use for an abstract port.
- **`server.ts`**:
  - **Job**: The application bootstrap file. It imports the configured application from `app.ts` and starts the necessary servers.
  - **Why**: Separates the application setup from the execution starting point.

---

## 3. Project Task Breakdown

- **Job 1-2**: Foundation, Config, and Common Utilities.
- **Job 3 (Revised)**: Domain and Core Application Logic (Webscrape request flow).
- **Job 4 (New)**: State Persistence Infrastructure (Repository port and in-memory adapter).
- **Job 5 (New)**: Crawl Response Logic (Application service and API consumer for handling responses).
- **Job 6 (New)**: Notification Infrastructure (Notification port and WebSocket adapter).
- **Job 7 (Final)**: Dependency Injection (Wiring all new components together in `app.ts`).
- **Job 8 (Final)**: Testing (Updated E2E tests for the new flow).

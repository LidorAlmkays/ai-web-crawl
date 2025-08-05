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

**Purpose:** Responsible for receiving external data, validating it, and orchestrating the initial flow into the application layer. This layer will abstract away specific communication protocols (e.g., WebSocket).

**Structure:**

api/
├── ports/
│ └── webscrape-event.port.ts // Interface for incoming webscrape events from the communication framework.
├── websocket/
│ ├── websocket.server.ts // WebSocket server setup and connection handling.
│ └── webscrape.handler.ts // Handles incoming 'webscrape' messages, validates payload, and calls application layer port.
└── index.ts // Exports API layer components.

**File Descriptions:**

- **`api/ports/webscrape-event.port.ts`**:
  - **Job**: Defines the interface that the `webscrape.handler.ts` will use to interact with the application layer.
  - **Why**: Enforces dependency inversion, allowing the `api` layer to depend on an abstraction defined in `application/ports`, making the `api` layer swappable.
  - **Content Example**:
    ```typescript
    export interface IWebscrapeEventHandler {
      handle(event: { query: string; url: string }): Promise<void>;
    }
    ```
- **`api/websocket/websocket.server.ts`**:
  - **Job**: Initializes and manages the WebSocket server, listens for connections, and dispatches incoming messages to appropriate handlers.
  - **Why**: Centralizes WebSocket setup and connection management.
- **`api/websocket/webscrape.handler.ts`**:
  - **Job**: Receives `webscrape` messages from the WebSocket server, performs input validation (e.g., `query` and `url` presence and format), and invokes the `IWebscrapeEventHandler` from the application layer.
  - **Why**: Decouples specific message handling from the general WebSocket server logic and provides a clear point for input validation.
  - **Testing Considerations**: Unit tests for input validation, mocking the application layer port.
- **`api/index.ts`**:
  - **Job**: Aggregates and re-exports components from the `api` layer for easier consumption by `app.ts`.
  - **Why**: Improves module organization and simplifies imports.

---

#### 2.2.2 `application/` Layer

**Purpose:** Contains the core business logic and use cases of the application. It orchestrates interactions between `domain` and `infrastructure` layers. This layer is independent of any external frameworks.

**Structure:**

application/
├── ports/
│ ├── crawl-request-publisher.port.ts // Interface for publishing crawl requests to infrastructure.
│ ├── crawl-response-consumer.port.ts // Interface for consuming crawl responses from infrastructure.
│ └── webscrape-use-case.port.ts // Interface for the webscrape use case, implemented here.
├── use-cases/
│ └── handle-webscrape.use-case.ts // Implements the IWebscrapeUseCase, contains hashing and Kafka interaction logic.
├── services/
│ └── hash-generator.service.ts // Pure function/class for generating hashes.
└── index.ts // Exports application layer components.

**File Descriptions:**

- **`application/ports/crawl-request-publisher.port.ts`**:
  - **Job**: Defines the interface for publishing crawl requests. This interface will be implemented by a specific Kafka adapter in the `infrastructure` layer.
  - **Why**: Allows the application layer to abstract away the concrete implementation of sending messages, making it easy to swap messaging systems.
  - **Content Example**:
    ```typescript
    export interface ICrawlRequestPublisher {
      publish(data: { hash: string; query: string; url: string }): Promise<void>;
    }
    ```
- **`application/ports/crawl-response-consumer.port.ts`**:
  - **Job**: Defines the interface for consuming crawl responses. This will be implemented by a Kafka adapter in `infrastructure`.
  - **Why**: Similar to the publisher port, it abstracts consumption logic.
  - **Content Example**:
    ```typescript
    export interface ICrawlResponseConsumer {
      startConsuming(handler: (message: { hash: string; result: any }) => Promise<void>): Promise<void>;
    }
    ```
- **`application/ports/webscrape-use-case.port.ts`**:

  - **Job**: Defines the interface for the primary webscrape use case, which the `api` layer will depend on.
  - **Why**: Enforces clear contract between API and application layers.
  - **Content Example**:

    ```typescript
    import { ICrawlRequestPublisher } from './crawl-request-publisher.port';

    export interface IWebscrapeUseCase {
      execute(event: { query: string; url: string }): Promise<void>;
    }
    ```

- **`application/use-cases/handle-webscrape.use-case.ts`**:
  - **Job**: Implements `IWebscrapeUseCase`. It receives the `webscrape` event, uses `hash-generator.service.ts` to create a hash, and then uses an injected `ICrawlRequestPublisher` to send the request to Kafka.
  - **Why**: Encapsulates the core business logic for handling webscrape requests.
  - **Testing Considerations**: Unit tests for hashing logic, mocking `ICrawlRequestPublisher` to verify correct payload.
- **`application/services/hash-generator.service.ts`**:
  - **Job**: Provides the specific hashing logic for `URL` and `query` combinations.
  - **Why**: Separates the hashing algorithm into a dedicated, reusable service.
  - **Testing Considerations**: Unit tests for various input combinations to ensure correct hash generation.
- **`application/index.ts`**:
  - **Job**: Aggregates and re-exports components from the `application` layer.
  - **Why**: Improves module organization.

---

#### 2.2.3 `domain/` Layer

**Purpose:** Contains enterprise-wide business rules and core entities. For this project, it will primarily house any shared models or value objects if they become necessary.

**Structure:**

domain/
└── models/
└── webscrape-event.model.ts // (Optional initially) Defines the structure of a webscrape event if more complex validation/methods are needed.

**File Descriptions:**

- **`domain/models/webscrape-event.model.ts`**:
  - **Job**: Defines the canonical structure of a webscrape event. Initially, it might be a simple interface, but could evolve to a class with validation methods if domain rules become more complex.
  - **Why**: Ensures a single source of truth for core data structures across layers.

---

#### 2.2.4 `infrastructure/` Layer

**Purpose:** Deals with external concerns such as databases, messaging systems (Kafka), and external services. This layer implements the interfaces (ports) defined in the `application` layer.

**Structure:**

infrastructure/
├── ports/
│ ├── crawl-request-sender.port.ts // Interface for sending crawl requests (implemented by Kafka).
│ └── crawl-response-listener.port.ts // Interface for listening to crawl responses (implemented by Kafka).
├── kafka/
│ ├── kafka-producer.ts // Kafka producer setup and message sending implementation.
│ ├── kafka-consumer.ts // Kafka consumer setup and message consumption implementation.
│ ├── send-crawl-request.adapter.ts // Implements crawl-request-sender.port using kafka-producer.ts.
│ └── listen-crawl-response.adapter.ts // Implements crawl-response-listener.port using kafka-consumer.ts.
└── index.ts // Exports infrastructure layer components.

**File Descriptions:**

- **`infrastructure/ports/crawl-request-sender.port.ts`**:
  - **Job**: Defines the interface for sending a crawl request. This is the counterpart to `application/ports/crawl-request-publisher.port.ts`.
  - **Why**: Ensures consistent contract for sending crawl requests, allowing different implementations (e.g., Kafka, HTTP) to adhere to the same API.
  - **Content Example**:
    ```typescript
    export interface ICrawlRequestSender {
      send(topic: string, message: { hash: string; query: string; url: string }): Promise<void>;
    }
    ```
- **`infrastructure/ports/crawl-response-listener.port.ts`**:
  - **Job**: Defines the interface for listening to crawl responses.
  - **Why**: Similar to the sender port, it provides an abstract contract for consuming responses.
  - **Content Example**:
    ```typescript
    export interface ICrawlResponseListener {
      listen(topic: string, handler: (message: { hash: string; result: any }) => Promise<void>): Promise<void>;
    }
    ```
- **`infrastructure/kafka/kafka-producer.ts`**:
  - **Job**: Low-level Kafka producer client setup and direct message sending logic.
  - **Why**: Encapsulates Kafka producer-specific details.
- **`infrastructure/kafka/kafka-consumer.ts`**:
  - **Job**: Low-level Kafka consumer client setup and direct message consumption logic.
  - **Why**: Encapsulates Kafka consumer-specific details.
- **`infrastructure/kafka/send-crawl-request.adapter.ts`**:
  - **Job**: Implements `ICrawlRequestSender` using `kafka-producer.ts` to send messages to the `crawl URL request topic`.
  - **Why**: Provides the concrete Kafka implementation for sending crawl requests, adhering to the `infrastructure/ports` interface.
  - **Testing Considerations**: Integration tests to verify messages are sent to Kafka, unit tests by mocking `kafka-producer.ts`.
- **`infrastructure/kafka/listen-crawl-response.adapter.ts`**:
  - **Job**: Implements `ICrawlResponseListener` using `kafka-consumer.ts` to consume messages from the `crawl URL response topic` and dispatch them to the `application` layer's registered handler.
  - **Why**: Provides the concrete Kafka implementation for listening to crawl responses.
  - **Testing Considerations**: Integration tests to verify messages are consumed from Kafka, unit tests by mocking `kafka-consumer.ts`.
- **`infrastructure/index.ts`**:
  - **Job**: Aggregates and re-exports components from the `infrastructure` layer.
  - **Why**: Improves module organization.

---

#### 2.2.5 `common/` Folder

**Purpose:** Houses utilities, shared types, and client setups that are used across multiple layers and frameworks.

**Structure:**

common/
├── utils/
│ └── logger.ts // Centralized logging utility.
│ └── validation.ts // Common validation helpers (e.g., URL validation regex).
├── clients/
│ └── kafka-client.ts // Common Kafka client instantiation and connection management.
└── types/
└── index.ts // Shared TypeScript interfaces/types.

**File Descriptions:**

- **`common/utils/logger.ts`**:
  - **Job**: Provides a consistent logging mechanism throughout the application.
  - **Why**: Centralizes logging configuration and ensures consistent log formats.
- **`common/utils/validation.ts`**:
  - **Job**: Contains reusable validation functions.
  - **Why**: Promotes code reuse and consistency in validation logic.
- **`common/clients/kafka-client.ts`**:
  - **Job**: Manages the instantiation and lifecycle of the core Kafka client (producer/consumer). This is distinct from the adapters in `infrastructure/kafka` which use this client.
  - **Why**: Ensures single instance and proper management of the Kafka connection, used by both API (for consuming) and Infrastructure (for publishing).
  - **Testing Considerations**: Unit tests for client connection and disconnection.
- **`common/types/index.ts`**:
  - **Job**: Defines shared TypeScript interfaces or types that are used by multiple layers.
  - **Why**: Prevents type duplication and ensures type consistency across the project.

---

#### 2.2.6 `config/` Folder

**Purpose:** Manages all application configurations, providing default values and allowing for environment-specific overrides.

**Structure:**

config/
├── index.ts // Main configuration loader and aggregator.
└── default.ts // Default configuration values.

**File Descriptions:**

- **`config/index.ts`**:
  - **Job**: Loads and merges configuration settings, potentially from environment variables or a configuration file, with `default.ts`.
  - **Why**: Centralized configuration management.
- **`config/default.ts`**:
  - **Job**: Defines all default configuration values (e.g., Kafka topic names, WebSocket port).
  - **Why**: Provides sensible defaults and a clear overview of configurable parameters.

---

#### 2.2.7 Root Files

- **`app.ts`**:
  - **Job**: The main entry point for dependency injection. All classes will be instantiated here and their dependencies (ports) injected. This file orchestrates the wiring of the entire application.
  - **Why**: Centralizes dependency management, adhering to the Dependency Inversion Principle of Clean Architecture.
  - **Testing Considerations**: High-level integration tests to ensure all components are correctly wired.
- **`server.ts`**:
  - **Job**: The application bootstrap file. It will import the configured application from `app.ts` and start the necessary servers (e.g., WebSocket server).
  - **Why**: Separates the application setup from the execution starting point.
  - **Testing Considerations**: End-to-end tests for server startup and basic connectivity.

---

## 3. Project Tasks and Sub-Jobs

### 3.1 Initial Project Setup

- **Task**: Initialize TypeScript project and basic file structure.
  - **Sub-jobs**:
    - Create `gateway/` directory.
    - `npm init -y` and `npm install typescript ts-node @types/node`.
    - Configure `tsconfig.json` (e.g., `target`, `module`, `outDir`, `rootDir`).
    - Create initial `app.ts` and `server.ts`.
    - Create `api`, `application`, `domain`, `infrastructure`, `common`, `config` folders with their `ports` subfolders where applicable.
  - **Tests/Checks**:
    - Verify `tsconfig.json` is correctly configured for compilation.
    - Confirm basic `app.ts` and `server.ts` compile without errors.

---

### 3.2 Configuration Module Development

- **Task**: Implement the configuration loading mechanism.
  - **Sub-jobs**:
    - Create `config/default.ts` with placeholder Kafka topic names (`CRAWL_URL_REQUEST_TOPIC`, `CRAWL_URL_RESPONSE_TOPIC`) and WebSocket port.
    - Create `config/index.ts` to load default config and allow environment variable overrides.
  - **Tests/Checks**:
    - Unit test `config/index.ts` to ensure default values are loaded.
    - Unit test `config/index.ts` to verify environment variables correctly override defaults.

---

### 3.3 Common Utilities Development

- **Task**: Set up common utilities and clients.
  - **Sub-jobs**:
    - Implement `common/utils/logger.ts`.
    - Implement `common/clients/kafka-client.ts` for connecting to Kafka.
    - Create `common/types/index.ts` for shared types.
  - **Tests/Checks**:
    - Unit tests for `logger.ts` to confirm logging behavior.
    - Unit tests for `kafka-client.ts` for connection and disconnection logic (mocking Kafka client library).

---

### 3.4 Domain Layer (Initial)

- **Task**: Define core domain models.
  - **Sub-jobs**:
    - Create `domain/models/webscrape-event.model.ts` (e.g., `interface WebscrapeEvent { query: string; url: string; }`).
  - **Tests/Checks**:
    - No specific tests needed at this stage beyond compilation check.

---

### 3.5 Application Layer Development

- **Task**: Develop the core business logic for handling webscrape events.
  - **Sub-jobs**:
    - Define `application/ports/crawl-request-publisher.port.ts` and `application/ports/webscrape-use-case.port.ts`.
    - Implement `application/services/hash-generator.service.ts` (e.g., using `crypto` module for SHA-256).
    - Implement `application/use-cases/handle-webscrape.use-case.ts`, injecting `ICrawlRequestPublisher` and `hash-generator.service`.
  - **Tests/Checks**:
    - **Unit Test `hash-generator.service.ts`**:
      - Input: `query: "test", url: "http://example.com"`
      - Expected: Consistent and correct hash output.
      - Edge Cases: Empty query/URL, special characters in query/URL.
    - **Unit Test `handle-webscrape.use-case.ts`**:
      - Mock `ICrawlRequestPublisher.publish` to assert it's called with the correct hash and input data.
      - Verify the use case handles valid inputs correctly.

---

### 3.6 Infrastructure Layer Development (Kafka)

- **Task**: Implement Kafka specific adapters for publishing and consuming messages.
  - **Sub-jobs**:
    - Define `infrastructure/ports/crawl-request-sender.port.ts` and `infrastructure/ports/crawl-response-listener.port.ts`.
    - Implement `infrastructure/kafka/kafka-producer.ts` and `infrastructure/kafka/kafka-consumer.ts` using `common/clients/kafka-client.ts`.
    - Implement `infrastructure/kafka/send-crawl-request.adapter.ts` which implements `ICrawlRequestSender` and uses `kafka-producer.ts` to send to `CRAWL_URL_REQUEST_TOPIC`.
    - Implement `infrastructure/kafka/listen-crawl-response.adapter.ts` which implements `ICrawlResponseListener` and uses `kafka-consumer.ts` to listen from `CRAWL_URL_RESPONSE_TOPIC`.
  - **Tests/Checks**:
    - **Unit Test `send-crawl-request.adapter.ts`**:
      - Mock `kafka-producer.ts` to verify `send` method is called with correct topic and message.
    - **Unit Test `listen-crawl-response.adapter.ts`**:
      - Mock `kafka-consumer.ts` to simulate incoming messages and verify the registered handler is invoked with correct data.
    - **Integration Test (Kafka Publisher)**:
      - Send a message through `send-crawl-request.adapter.ts` and verify it appears in the Kafka topic using a separate test consumer.
    - **Integration Test (Kafka Consumer)**:
      - Publish a message directly to the Kafka `CRAWL_URL_RESPONSE_TOPIC` and verify `listen-crawl-response.adapter.ts` correctly consumes and processes it (e.g., by logging or triggering a callback).

---

### 3.7 API Layer Development (WebSocket)

- **Task**: Implement the WebSocket server and handlers for incoming requests.
  - **Sub-jobs**:
    - Define `api/ports/webscrape-event.port.ts`.
    - Implement `api/websocket/websocket.server.ts` to set up and manage WebSocket connections.
    - Implement `api/websocket/webscrape.handler.ts` which implements `IWebscrapeEventHandler`, receives WebSocket messages, validates them, and calls the `IWebscrapeUseCase` from the application layer.
  - **Tests/Checks**:
    - **Unit Test `webscrape.handler.ts`**:
      - Valid input payload: Verify `IWebscrapeUseCase.execute` is called with the correct data.
      - Invalid input payload (missing `query` or `url`): Verify appropriate error handling and no call to `IWebscrapeUseCase.execute`.
    - **Integration Test (WebSocket)**:
      - Start the `websocket.server.ts`.
      - Use a WebSocket client to send a `webscrape` message.
      - Verify the message is correctly received by `webscrape.handler.ts` and the application layer's `IWebscrapeUseCase` is invoked (requires mocking or a full end-to-end test).

---

### 3.8 Dependency Injection and Application Startup

- **Task**: Wire up all components in `app.ts` and start the server in `server.ts`.
  - **Sub-jobs**:
    - In `app.ts`, import all necessary classes and their respective ports.
    - Instantiate concrete implementations and inject them into their dependencies.
    - In `server.ts`, import the configured application from `app.ts` and start the WebSocket server.
    - Start the Kafka consumer (for crawl responses) in `server.ts` once the application is ready.
  - **Tests/Checks**:
    - **End-to-End Test (Full Flow)**:
      - Start the `server.ts`.
      - Send a `webscrape` event via WebSocket.
      - Verify a message appears in the `CRAWL_URL_REQUEST_TOPIC` Kafka topic.
      - Manually (or via another test utility) publish a message to `CRAWL_URL_RESPONSE_TOPIC`.
      - Verify the application consumes this message (e.g., through logs or an exposed metric).
    - Verify the application starts without dependency injection errors.

---

## 4. Testing and Quality Assurance

Testing will be a continuous process throughout development, integrated into each task.

### 4.1 Unit Tests

- **Focus**: Individual functions, classes, and modules in isolation.
- **Tools**: Jest (or similar).
- **Coverage**: Aim for high code coverage, especially in `application` and `domain` layers.

### 4.2 Integration Tests

- **Focus**: Interactions between different components and layers (e.g., API to Application, Application to Infrastructure).
- **Tools**: Jest, Supertest (for API if using HTTP, not strictly for WebSocket here), Testcontainers (for Kafka).
- **Scope**:
  - API layer correctly calls Application layer.
  - Application layer correctly calls Infrastructure layer.
  - Infrastructure layer correctly interacts with Kafka (publishing and consuming).

### 4.3 End-to-End (E2E) Tests

- **Focus**: Verifying the entire application flow from external input to external output.
- **Tools**: Jest, WebSocket client library, Kafka client library.
- **Scope**: Simulate a full `webscrape` event:
  1.  Client sends `webscrape` event to WebSocket API.
  2.  Gateway processes, hashes, and publishes to Kafka `CRAWL_URL_REQUEST_TOPIC`.
  3.  (Simulated or actual) External system consumes the request and publishes a response to `CRAWL_URL_RESPONSE_TOPIC`.
  4.  Gateway consumes the response.

### 4.4 Code Quality Checks

- **Linting**: ESLint with TypeScript rules.
- **Formatting**: Prettier.
- **Static Analysis**: SonarQube (optional, for more advanced analysis).

---

## 5. Deployment Considerations (Future)

- Dockerization for easy deployment.
- Container orchestration (Kubernetes) for scalability and resilience.
- Monitoring and logging setup (Prometheus, Grafana, ELK stack).
- Secrets management for sensitive configurations (e.g., Kafka credentials).

---

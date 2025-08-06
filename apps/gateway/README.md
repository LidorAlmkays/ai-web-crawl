# Gateway Service

## Overview

The Gateway Service is the primary entry point for all client interactions within the web crawling ecosystem. It is a highly scalable and resilient service that orchestrates the flow of crawl requests, manages their state, and communicates with other backend services in real-time.

This service is built using a **Hexagonal Architecture** (Ports and Adapters), which decouples the core business logic from the infrastructure, making it easy to test, maintain, and extend.

## Documentation

This README provides a high-level overview of the project. For detailed information on specific topics, please refer to the documentation in the `docs` directory:

- **[Getting Started](./docs/getting-started.md)**: A step-by-step guide to setting up your development environment and running the application.
- **[Architecture](./docs/architecture.md)**: A deep dive into the hexagonal architecture, its components, and how they interact.
- **[Communication Protocols](./docs/protocols.md)**: Detailed information on the supported communication protocols (WebSocket and Kafka), including message formats and topic names.
- **[Extensibility Guide](./docs/extensibility.md)**: Instructions on how to add new features or modify existing ones.
- **[Configuration Guide](./docs/configuration.md)**: A guide to configuring the service using environment variables and configuration files.

## Getting Started

To get the service up and running, follow the instructions in the **[Getting Started](./docs/getting-started.md)** guide.

## Key Features

- **Real-time Communication**: Exposes a WebSocket API for bidirectional communication with clients.
- **Asynchronous Processing**: Uses Kafka for asynchronous messaging with backend services, ensuring scalability and resilience.
- **State Management**: Tracks the state of each crawl request in a Redis database.
- **Decoupled Architecture**: Follows the Hexagonal Architecture pattern for a modular and testable codebase.
- **Extensible Design**: Easy to add new features or swap out infrastructure components.

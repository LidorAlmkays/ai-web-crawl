# PRD: Single Kafka Client + API-Scoped KafkaManager

## Problem / MVP

- Ensure reliable Kafka consumption with offset persistence, minimal duplication, and clean modularity.
- Use a single Kafka client instance for the whole service lifecycle.
- Move KafkaManager into the API layer: its only responsibility is to manage consumers (register, start, pause, resume, stop).
- Consumers implement a common interface, each with exactly one topic, sourced from a config topics dictionary (env-driven).
- Provide pause/resume operations across all configured topics without hardcoding (iterate topics dictionary).
- Keep `app.ts` clean: constructor handles initialization; `start()` triggers runtime.

## Scope & Non-Goals

- In-scope: config refactor, consumer interface, API KafkaManager, TaskStatusConsumer refactor, app.ts cleanup, pause/resume across topics, testing & cleanup of old logic.
- Out-of-scope: adding new task types beyond current web-crawl handlers.

## Architecture Overview

- Single Kafka Client
  - Created once in composition root (`app.ts`), using existing `KafkaClient`.
  - Shared across API KafkaManager and consumers.
- API KafkaManager (NEW)
  - Lives under `api/kafka/kafka.manager.ts`.
  - Constructor receives `KafkaClient` and consumer dependencies (e.g., `webCrawlTaskManager`).
  - Registers consumers and manages lifecycle: `startAllConsumers`, `pauseAllConsumers`, `resumeAllConsumers`, `stopAllConsumers`.
  - Pause/Resume iterate over `kafkaConfig.topics` keys to pause/resume all topic streams (future-proof for new topics) and may additionally call consumer pause/resume to keep internal state.
- Consumers
  - Implement `IConsumer` interface: `startConsuming`, `pause`, `resume`, `stop`, `isConsuming`, and `topic` property.
  - Each consumer knows exactly one `topic` from `kafkaConfig.topics`.
  - `TaskStatusConsumer` keeps the internal handler dictionary for status routing and uses DTOs for validation.
- Config
  - `kafkaConfig.topics` is a dictionary validated by `zod`, driven by env vars (e.g., `TASK_STATUS_TOPIC`).
  - Example: `{ taskStatus: process.env.TASK_STATUS_TOPIC ?? 'task-status' }`.

## File Structure

- apps/task-manager/src/
  - app.ts
  - config/
    - index.ts (re-export consolidated config)
    - kafka.config.ts (zod-validated; includes `topics` dict)
  - common/
    - clients/
      - kafka-client.ts (single instance used app-wide)
  - api/
    - kafka/
      - kafka.manager.ts (API-scoped; manages consumers)
      - consumers/
        - consumer.interface.ts (IConsumer)
        - task-status.consumer.ts (implements IConsumer; topic from config)
      - handlers/
        - base-handler.interface.ts
        - base-handler.ts
        - task-status/
          - new-task.handler.ts
          - complete-task.handler.ts
          - error-task.handler.ts

## Interface-First Definitions

- IConsumer
  - Methods:
    - `startConsuming(kafkaClient: KafkaClient): Promise<void>`
    - `pause(kafkaClient: KafkaClient): Promise<void>`
    - `resume(kafkaClient: KafkaClient): Promise<void>`
    - `stop(kafkaClient: KafkaClient): Promise<void>`
    - `isConsuming(): boolean`
  - Properties:
    - `topic: string`
- API KafkaManager
  - Constructor: `(kafkaClient: KafkaClient, deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort })`
  - Methods: `registerConsumer`, `startAllConsumers`, `pauseAllConsumers`, `resumeAllConsumers`, `stopAllConsumers`
- Kafka Topics Config
  - Input: env `TASK_STATUS_TOPIC`
  - Output: `kafkaConfig.topics.taskStatus: string`

## Input/Output Contracts

- kafkaConfig.topics
  - In: env variables
  - Out: validated dictionary `{ taskStatus: string }`
- KafkaManager.startAllConsumers()
  - Out: all registered consumers subscribed and running
- KafkaManager.pauseAllConsumers()/resumeAllConsumers()
  - Out: all topics from config paused/resumed
- Consumer.startConsuming()
  - Out: consumer subscribed to `topic` and handler registered

## State Diagrams

- Manager: Idle → Starting → Running ↔ Paused → Stopping → Idle
- Consumer: Idle → Subscribed → Consuming ↔ Paused → Stopped

## Pseudocode Highlights

- kafka.config.ts
  - `topics = { taskStatus: process.env.TASK_STATUS_TOPIC ?? 'task-status' }`
  - validate with zod
- KafkaManager
  - holds `consumers: IConsumer[]`
  - pause/resume iterate `Object.values(kafkaConfig.topics)` and call `kafkaClient.pauseTopics/resumeTopics`
- TaskStatusConsumer
  - uses `kafkaConfig.topics.taskStatus` as `topic`
  - routes by header.status to handlers

## Packages

- kafkajs (via existing KafkaClient)
- class-validator, class-transformer
- zod (config validation)
- winston (logging)

## Vital Logging

- Manager: registering/starting/pausing/resuming consumers, errors with topic context
- Consumer: subscribed to topic, processing start/success/error, offsets

## Risks

- Ensure only one KafkaClient instance is created
- Pause/resume symmetry across both client-level topics and consumer state
- Env/topic misconfiguration (mitigated by zod validation)

## Acceptance Criteria

- Single KafkaClient used
- API KafkaManager manages consumers only
- Topics from env via dictionary
- Pause/resume iterate all configured topics
- app.ts minimal and clean
- Tests for start/pause/resume and message flow








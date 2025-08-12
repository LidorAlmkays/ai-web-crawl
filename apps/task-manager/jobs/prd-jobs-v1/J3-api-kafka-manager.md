# J3: API KafkaManager (Consumer Lifecycle Manager)

## Goal

Create an API-scoped KafkaManager that receives the single KafkaClient and manages consumers.

## Tasks

- File: `apps/task-manager/src/api/kafka/kafka.manager.ts`
- Constructor: `(kafkaClient: KafkaClient, deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort })`
- Fields: `consumers: IConsumer[]`
- Methods:
  - `registerConsumer(consumer: IConsumer): void`
  - `startAllConsumers(): Promise<void>` – iterates consumers, calls `startConsuming`
  - `pauseAllConsumers(): Promise<void>` – iterates `kafkaConfig.topics` and calls `kafkaClient.pauseTopics([{ topic }])`
  - `resumeAllConsumers(): Promise<void>` – iterates `kafkaConfig.topics` and calls `kafkaClient.resumeTopics([{ topic }])`
  - `stopAllConsumers(): Promise<void>` – iterates consumers, calls `stop`
- Logging: info for operations; error on failures with topic context

## Acceptance

- Compiles
- Start/pause/resume/stop callable without side effects when no consumers registered
- Logs visible for each operation








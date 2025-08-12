# J2: Create IConsumer Interface and BaseConsumer

## Goal

Provide a standard lifecycle interface and a base class to avoid duplicated pause/resume/stop logic.

## Tasks

- Create/update `apps/task-manager/src/api/kafka/consumers/consumer.interface.ts`
  - Methods: `start(kafkaClient, handler)`, `pause(kafkaClient)`, `resume(kafkaClient)`, `stop(kafkaClient)`, `isConsuming()`
  - Property: `topic: string`
- Create `apps/task-manager/src/api/kafka/consumers/base-consumer.ts`
  - Constructor(topic: string)
  - Implements `pause/resume/stop/isConsuming` using `KafkaClient.pauseTopics/resumeTopics`
  - Abstract `start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>`

## Acceptance

- Compiles and lints
- Consumers can extend BaseConsumer easily

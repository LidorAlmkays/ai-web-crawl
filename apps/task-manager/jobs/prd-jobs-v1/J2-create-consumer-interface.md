# J2: Create IConsumer Interface

## Goal

Define a common interface for all Kafka consumers.

## Spec

- File: `apps/task-manager/src/api/kafka/consumers/consumer.interface.ts`
- Interface `IConsumer`:
  - Methods:
    - `startConsuming(kafkaClient: KafkaClient): Promise<void>`
    - `pause(kafkaClient: KafkaClient): Promise<void>`
    - `resume(kafkaClient: KafkaClient): Promise<void>`
    - `stop(kafkaClient: KafkaClient): Promise<void>`
    - `isConsuming(): boolean`
  - Properties:
    - `topic: string`

## Acceptance

- Compiles
- TaskStatusConsumer can implement it without type gaps








# J5: Refactor TaskStatusConsumer to Extend BaseConsumer

## Goal

Make TaskStatusConsumer extend BaseConsumer, and accept a single handler (TaskStatusRouterHandler). Start subscribes and binds that handler.

## Tasks

- Update `apps/task-manager/src/api/kafka/consumers/task-status.consumer.ts`:
  - Extend `BaseConsumer`
  - Constructor(topic: string)
  - Implement `start(kafkaClient, handler)`:
    - `await kafkaClient.subscribe(this.topic, handler.process.bind(handler))`
    - set internal consuming flag (subscribed, not yet consuming)
  - Remove internal creation of New/Complete/Error handlers; that is now inside the router handler

## Acceptance

- Compiles
- Subscribes to topic and processes messages via the provided handler
- No internal handler dictionary remains in the consumer

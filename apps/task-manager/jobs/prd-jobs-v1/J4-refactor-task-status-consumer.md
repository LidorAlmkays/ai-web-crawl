# J4: Refactor TaskStatusConsumer to IConsumer + Config Topic

## Goal

Make TaskStatusConsumer implement IConsumer, use topic from config, and keep internal handler routing.

## Tasks

- Update `apps/task-manager/src/api/kafka/consumers/task-status.consumer.ts`:
  - Implement `IConsumer`
  - Add `topic = kafkaConfig.topics.taskStatus`
  - Add `startConsuming(kafkaClient)` to `subscribe(topic, handler)` and `startConsuming()`
  - Add `pause(kafkaClient)` and `resume(kafkaClient)` using `pauseTopics`/`resumeTopics` for `this.topic`
  - Add `stop(kafkaClient)` (best-effort stop/unassign if supported; else log no-op)
  - Keep header validation and status-based handler dictionary

## Acceptance

- Compiles
- Subscribes to configured topic
- Processes messages and logs appropriately
- pause/resume methods operate on the configured topic








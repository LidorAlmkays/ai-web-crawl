# J5: Refactor app.ts for Single Kafka Client and Clean Startup

## Goal

Use a single KafkaClient in app.ts, move consumer lifecycle to API KafkaManager, and keep app.ts clean.

## Tasks

- In `apps/task-manager/src/app.ts`:
  - Constructor: initialize PostgresFactory, KafkaClient, repository, service, API KafkaManager
  - Create TaskStatusConsumer with topic from config and register with KafkaManager
  - start(): wait for Postgres and KafkaClient init; call `kafkaManager.startAllConsumers()`
  - Remove references to router/orchestrator

## Acceptance

- `nx serve task-manager` starts successfully
- Logs show subscription and consuming started
- No unused variables/imports








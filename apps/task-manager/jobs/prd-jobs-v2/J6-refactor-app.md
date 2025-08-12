# J6: Refactor app.ts for KafkaFactory → KafkaApiManager Flow

## Goal

Keep app.ts minimal; use KafkaFactory to get the single client, pass it to KafkaApiManager, and call start().

## Tasks

- In `apps/task-manager/src/app.ts`:
  - Use `KafkaFactory` to await init and get `KafkaClient`
  - Construct `KafkaApiManager(kafkaClient, { webCrawlTaskManager })`
  - Call `await kafkaApiManager.start()` in `start()`
  - Update graceful shutdown to call `pause()` then `stop()`
  - Remove direct references to `KafkaRouter` or old manager

## Acceptance

- Build and serve succeed
- Logs reflect start/pause/stop flows via KafkaApiManager








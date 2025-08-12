# J4: KafkaApiManager – Start/Pause/Resume/Stop

## Goal

Create an API-level manager that receives the single KafkaClient, registers consumer/handler pairs via KafkaRouter, and manages lifecycle.

## Tasks

- Create `apps/task-manager/src/api/kafka/kafka-api.manager.ts`
  - Constructor: `(kafkaClient: KafkaClient, deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort })`
  - Fields: `registrations: Array<{ consumer: IConsumer; handler: IHandler }>`
  - Methods:
    - `start()`: calls `registerConsumers(deps)` to get registrations, then `for (const r of registrations) await r.consumer.start(kafkaClient, r.handler)` (subscribes), then `await kafkaClient.startConsuming()` once
    - `pause()`: iterate `kafkaConfig.topics` to pause via client; also call `r.consumer.pause(kafkaClient)`
    - `resume()`: iterate `kafkaConfig.topics` to resume via client; also call `r.consumer.resume(kafkaClient)`
    - `stop()`: call `r.consumer.stop(kafkaClient)` for each

## Acceptance

- Compiles
- No side effects before `start()`
- Logs lifecycle operations

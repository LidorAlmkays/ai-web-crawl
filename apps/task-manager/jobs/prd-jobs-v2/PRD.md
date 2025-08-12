# PRD-v2: Single Kafka Client + API KafkaApiManager + KafkaRouter Registration

## Problem / MVP

- Use a single Kafka client (for consuming and publishing) managed by a common KafkaFactory.
- KafkaApiManager (API layer) manages consumer lifecycle: start, pause, resume, stop.
- KafkaRouter (API layer) returns the list of (consumer, single handler) registrations; it creates consumers and handlers internally. No inputs besides deps; no side effects (no starting).
- Consumers implement a small interface with four lifecycle methods and exactly one topic (from config topics dictionary via env).
- Avoid duplicated logic in consumers: provide a BaseConsumer for shared pause/resume/stop logic.
- Keep app.ts minimal: construct factories, get KafkaClient, construct KafkaApiManager with dependencies, call start().

## Architecture (adjusted)

- Common Layer
  - `KafkaFactory` (existing): manages creation and lifecycle of the single `KafkaClient` instance.
  - `KafkaClient` (existing): wraps kafkajs consumer/producer; used for subscribe/pause/resume/commit/send.
- API Layer
  - `KafkaApiManager` (NEW): receives the `KafkaClient` and required dependencies. Exposes `start()`, `pause()`, `resume()`, `stop()` which apply across all registered consumers.
  - `KafkaRouter` (NEW or repurposed): exposes `registerConsumers(deps) => Array<{ consumer: IConsumer; handler: IHandler }>` that declares which consumer pairs with which single handler. No side-effects beyond registration.
  - `IConsumer` (NEW): lifecycle interface with `start(kafkaClient, handler)`, `pause`, `resume`, `stop`, `isConsuming`, and `topic`.
  - `BaseConsumer` (NEW): implements `pause`, `resume`, `stop`, `isConsuming` once; subclasses implement `start(kafkaClient, handler)` and set `topic`.
  - `TaskStatusConsumer`: extends `BaseConsumer`; `topic = kafkaConfig.topics.taskStatus`; on start subscribes and binds the provided single handler. Its handler for this topic will be a router handler.
  - Handlers: introduce `TaskStatusRouterHandler` that is the single handler for `task-status`, and internally delegates to `NewTaskHandler` / `CompleteTaskHandler` / `ErrorTaskHandler` based on validated headers. Other topics use a single, simple handler.
- Config Layer
  - `kafkaConfig.topics` dictionary with env-driven names (e.g., `TASK_STATUS_TOPIC`).
- App Composition
  - app.ts constructs `PostgresFactory`, `KafkaFactory`; obtains the single `KafkaClient` from `KafkaFactory`.
  - app.ts constructs `KafkaApiManager(kafkaClient, deps)` and calls `await kafkaApiManager.start()`.

## Project Structure

- apps/task-manager/src/
  - app.ts
  - config/
    - index.ts
    - kafka.ts (zod-validated env; includes `topics` dict)
  - common/
    - clients/
      - kafka-client.ts
      - kafka.factory.ts (manages `KafkaClient` lifecycle)
  - api/
    - kafka/
      - kafka-api.manager.ts (NEW)
      - kafka.router.ts (NEW: registration-only)
      - consumers/
        - consumer.interface.ts (IConsumer)
        - base-consumer.ts (BaseConsumer)
        - task-status.consumer.ts
      - handlers/
        - base-handler.interface.ts
        - base-handler.ts
        - task-status/
          - task-status-router.handler.ts (NEW)
          - new-task.handler.ts
          - complete-task.handler.ts
          - error-task.handler.ts
      - dtos/ (already present)

## Interface-First Definitions (adjusted)

- IConsumer
  - Properties: `topic: string`
  - Methods:
    - `start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>`
    - `pause(kafkaClient: KafkaClient): Promise<void>`
    - `resume(kafkaClient: KafkaClient): Promise<void>`
    - `stop(kafkaClient: KafkaClient): Promise<void>`
    - `isConsuming(): boolean`
- BaseConsumer
  - Constructor(topic: string)
  - Implements: `pause/resume/stop/isConsuming` using `kafkaClient.pauseTopics/resumeTopics` and internal `consuming` flag
  - Abstract `start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>` to be implemented by subclass
- KafkaApiManager
  - Constructor: `(kafkaClient: KafkaClient, deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort })`
  - Public methods: `start(): Promise<void>`, `pause(): Promise<void>`, `resume(): Promise<void>`, `stop(): Promise<void>`
  - Internals:
    - Holds `registrations: Array<{ consumer: IConsumer; handler: IHandler }>`
    - Uses `KafkaRouter.registerConsumers((consumer, handler)=>this.registrations.push({consumer, handler}), deps)` during `start()` prior to starting them
    - Iterates registrations for lifecycle methods (start uses consumer+handler; pause/resume/stop call consumer methods)
    - Pause/Resume also iterate config topics via `kafkaConfig.topics` to apply client-level pause/resume
- KafkaRouter
  - Function: `registerConsumers(deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }): Array<{ consumer: IConsumer; handler: IHandler }>`
    - Creates `TaskStatusConsumer` and `TaskStatusRouterHandler` internally
    - Returns `[ { consumer, handler } ]`
- TaskStatusRouterHandler
  - Implements `IHandler`; composes `NewTaskHandler`, `CompleteTaskHandler`, `ErrorTaskHandler`
  - Validates `TaskStatusHeaderDto`, routes based on `status` field

## Input/Output Contracts

- Config topics
  - In: `process.env.TASK_STATUS_TOPIC`
  - Out: `kafkaConfig.topics.taskStatus`
- KafkaApiManager.start()
  - Side effects: calls router to get registrations, subscribes all consumers, then calls `kafkaClient.startConsuming()` once
- Consumer.start()
  - Side effects: `kafkaClient.subscribe({topic: this.topic}, (payload)=>handler.process(payload))` only; sets `consuming=true`
- Pause/Resume
  - Manager applies both topic-level pause/resume via client using `kafkaConfig.topics` and per-consumer pause/resume for internal state

## State Diagrams

- Manager: Idle → Registering → Starting → Running ↔ Paused → Stopping → Idle
- Consumer: Idle → Subscribed → Consuming ↔ Paused → Stopped

## Pseudocode (adjusted)

- KafkaRouter.registerConsumers

```ts
export function registerConsumers(deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }): Array<{ consumer: IConsumer; handler: IHandler }> {
  const routerHandler = new TaskStatusRouterHandler(deps.webCrawlTaskManager);
  const consumer = new TaskStatusConsumer(kafkaConfig.topics.taskStatus);
  return [{ consumer, handler: routerHandler }];
}
```

- KafkaApiManager.start

```ts
async start() {
  this.registrations = registerConsumers(this.deps);
  // Subscribe all consumers first
  for (const { consumer, handler } of this.registrations) {
    await consumer.start(this.kafkaClient, handler); // subscribes only
  }
  // Start consuming once after all subscriptions
  await this.kafkaClient.startConsuming();
}
```

- BaseConsumer

```ts
abstract class BaseConsumer implements IConsumer {
  constructor(public readonly topic: string) {}
  protected consuming = false;
  abstract start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>;
  async pause(k: KafkaClient) {
    await k.pauseTopics([{ topic: this.topic }]);
    this.consuming = false;
  }
  async resume(k: KafkaClient) {
    await k.resumeTopics([{ topic: this.topic }]);
    this.consuming = true;
  }
  async stop(_k: KafkaClient) {
    this.consuming = false;
  }
  isConsuming() {
    return this.consuming;
  }
}
```

- TaskStatusConsumer.start

```ts
async start(kafkaClient: KafkaClient, handler: IHandler) {
  await kafkaClient.subscribe(this.topic, handler.process.bind(handler));
  this.consuming = true; // subscribed, not yet consuming
}
```

- TaskStatusRouterHandler

```ts
class TaskStatusRouterHandler implements IHandler {
  constructor(private readonly deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }) {}
  private handlers = {
    new: new NewTaskHandler(this.deps.webCrawlTaskManager),
    complete: new CompleteTaskHandler(this.deps.webCrawlTaskManager),
    error: new ErrorTaskHandler(this.deps.webCrawlTaskManager),
  };
  async process(payload: EachMessagePayload) {
    const headers = extractHeaders(payload.message.headers);
    const result = await validateDto(TaskStatusHeaderDto, headers);
    if (!result.isValid) throw new Error(result.errorMessage);
    const { status } = result.validatedData as TaskStatusHeaderDto;
    const handler = this.handlers[status];
    if (!handler) throw new Error(`No handler for status ${status}`);
    await handler.process(payload);
  }
}
```

## Logging

- Manager: "Registering consumers", "Starting all consumers", "Pausing topics", "Resuming topics"
- Consumer: "Subscribed to topic", "Paused/Resumed topic"
- RouterHandler: "Processing task-status", "Invalid headers", "Routed to handler"

## Packages

- kafkajs
- class-validator, class-transformer
- zod
- winston

## Risks

- Duplicated pause/resume at both client and consumer—ensure idempotency
- Misconfiguration of env topics—mitigated by zod

## Acceptance Criteria (unchanged core)

- Single KafkaClient instance
- KafkaApiManager start/pause/resume/stop across all consumers
- KafkaRouter registers (consumer, single handler) pairs only
- Consumers implement lifecycle and bind the given handler on start
- For `task-status`, the single handler is a router handler that delegates based on headers
- app.ts remains minimal

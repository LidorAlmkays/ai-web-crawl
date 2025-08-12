# J3: KafkaRouter – Registration Only

## Goal

Provide a function that constructs consumers and their single handlers internally, and returns the registrations. No side effects.

## Tasks

- Create/update `apps/task-manager/src/api/kafka/kafka.router.ts` to export:
  - `export function registerConsumers(deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }): Array<{ consumer: IConsumer; handler: IHandler }>`
- Inside the function:
  - Create `TaskStatusRouterHandler` (single handler that routes by status)
  - Instantiate `TaskStatusConsumer(topicFromConfig)`
  - Return `[ { consumer: taskStatusConsumer, handler: taskStatusRouterHandler } ]`
- No starting, pausing, resuming, or client usage here.

## Acceptance

- Function returns intended consumer/handler registrations
- No side effects beyond creating objects

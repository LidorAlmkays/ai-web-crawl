# J1: Config – Topics Dictionary via ENV

## Goal

Introduce `kafkaConfig.topics` as a zod-validated dictionary sourced from environment variables.

## Tasks

- Add `apps/task-manager/src/config/kafka.config.ts` with:
  - `topics = { taskStatus: process.env.TASK_STATUS_TOPIC ?? 'task-status' }`
  - zod schema to validate non-empty strings
- Re-export via `apps/task-manager/src/config/index.ts`
- Update usages to reference `kafkaConfig.topics.taskStatus`

## Env

- `TASK_STATUS_TOPIC=task-status` (default)

## Acceptance

- Build succeeds
- Overriding `TASK_STATUS_TOPIC` changes the topic used by consumers
- Validation errors if topic is empty








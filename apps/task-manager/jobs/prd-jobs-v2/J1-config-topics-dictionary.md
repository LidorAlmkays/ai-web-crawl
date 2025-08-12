# J1: Config – Env-Driven Topics Dictionary

## Goal

Ensure `kafkaConfig.topics` is sourced from env with zod validation.

## Tasks

- Confirm `apps/task-manager/src/config/kafka.ts` defines:
  - `TASK_STATUS_TOPIC` env with default `task-status`
  - `topics = { taskStatus: process.env.TASK_STATUS_TOPIC }`
  - zod validations
- Update any remaining references to use `kafkaConfig.topics.taskStatus`

## Acceptance

- Build passes
- Overriding env works
- No hard-coded topic strings remain where config should be used








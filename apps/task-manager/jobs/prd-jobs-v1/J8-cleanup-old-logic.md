# J8: Cleanup Old Logic and Ensure Codebase is Clean

## Goal

Remove deprecated router/orchestrator code and unused files, align imports to new API KafkaManager, and ensure cleanliness.

## Tasks

- Remove/replace any remaining references to KafkaRouter/Orchestrator
- Delete unused job docs that conflict with new PRD (keep for history if needed under `archive/`)
- Update imports to `api/kafka/kafka.manager` and new `IConsumer`
- Ensure `task-status.consumer.ts` no longer relies on old router subscription flow
- Run linters and formatters; fix warnings/errors

## Acceptance

- No references to old router/orchestrator
- Lint passes
- Build and serve succeed
- Code owners agree code is clean and consistent








# J7: Testing and Cleanup

## Build & Serve

- `npx nx build task-manager`
- `npx nx serve task-manager`

## Tests

- Verify env topic usage (`TASK_STATUS_TOPIC`)
- Validate start/pause/resume/stop at manager level
- Produce messages and observe handlers
- Ensure offsets commit properly

## Cleanup

- Remove obsolete router/orchestrator code paths
- Ensure no consumer constructs handlers internally (handlers injected by router)
- Lint & format

## Acceptance

- No unused imports
- Clean logs
- End-to-end works








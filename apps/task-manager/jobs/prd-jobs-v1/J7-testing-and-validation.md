# J7: Testing and Validation

## Build & Serve

- `npx nx build task-manager`
- `npx nx serve task-manager`

## Kafka

- Verify single KafkaClient is created
- Confirm consumer registers to `kafkaConfig.topics.taskStatus`
- Produce test messages and confirm handlers fire
- Validate offset behavior and error logging

## Pause/Resume

- Call `kafkaManager.pauseAllConsumers()` and `resumeAllConsumers()`
- Confirm logs and behavior

## DTOs & Validation

- Validate header DTOs and message DTOs for each handler

## Success Criteria

- No TypeScript errors, clean logs, correct topic from env, robust pause/resume








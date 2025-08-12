# J6: Pause/Resume All Consumers via Topics Dictionary

## Goal

Provide pause/resume for all configured topics using the topics dictionary to future-proof for more topics.

## Tasks

- In `api/kafka/kafka.manager.ts` implement:
  - `pauseAllConsumers()` – iterate `Object.values(kafkaConfig.topics)` and call `kafkaClient.pauseTopics([{ topic }])`
  - `resumeAllConsumers()` – iterate similarly and call `kafkaClient.resumeTopics([{ topic }])`
- Optionally also call `consumer.pause/resume` to keep per-consumer state in sync

## Acceptance

- Manual test shows topics paused/resumed (observe logs)
- No errors when called multiple times








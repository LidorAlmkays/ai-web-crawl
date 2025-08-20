# Job J13: Kafka CLI Trace Enrichment (Service-like Emitter)

Status: ✅ Completed
Priority: High
Dependencies: J1 (OTEL), J10 (CLI script)
ETA: 0.5-1 hour

## Summary
Make the `publish-new-task.ts` CLI act like a real service:
- Start a root span with resource attributes (service.name, deployment env).
- Ensure producer span is a child and that W3C headers are visible in Kafka message headers.
- Print trace context at emission time and provide a copy-pasteable `traceparent`.

## Detailed Changes
- `scripts/publish-new-task.ts`:
  - Ensure OTEL init occurs before importing `kafkajs` (avoid instrumentation warning).
  - Create a root span `service.request` with attributes:
    - `service.name=cli-publisher`, `deployment.environment=development`, business fields (email/url).
  - Log `traceId`/`spanId` and computed `traceparent` string.
  - Optionally inject `--traceparent`/`--tracestate` to headers; otherwise allow auto-instrumentation.

## Output
- Console prints:
  - Kafka details (topic/partition/offset if returned)
  - Trace details `{ traceId, spanId, traceparent }`
  - Minimal, no correlationId

## Verification
- Run CLI, confirm headers carry W3C context in consumer.
- Confirm connected spans in backend (CLI root → producer → consumer).

## Checklist
- [ ] OTEL init precedes kafkajs import
- [ ] Root span + child producer span
- [ ] Print traceId/spanId/traceparent
- [ ] Headers show W3C traceparent

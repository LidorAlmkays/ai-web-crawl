# Job J10: Update Kafka Test Script (publish-new-task)

Status: ✅ Completed
Priority: Low
Dependencies: J5 (DTO Validation)
Estimated Time: 0.5-1 hour

## Summary
Refactor the CLI test script that publishes a NEW web-crawl task to Kafka so it aligns with the updated DTOs and our decision to remove business-level correlationId. The script should rely on OTEL auto-instrumentation for correlation (traceId/spanId) and optionally support passing W3C headers if needed by tests.

## Files to Modify
- `apps/task-manager/scripts/publish-new-task.ts` ✅

## Detailed Changes
- Remove correlationId usage ✅
  - Stop adding `correlation_id` to Kafka headers ✅
  - Stop using `correlationId` as the Kafka message key ✅
  - Ensure logging prints OTEL `traceId`/`spanId` captured from the active span ✅
- Optional W3C header support (only if required by DTO J5) ✅
  - If J5 requires W3C headers in NEW messages, support `--traceparent` and `--tracestate` flags to inject them into headers ✅
  - Otherwise, omit W3C flags entirely (KafkaJS instrumentation will propagate context automatically) ✅
- Ensure OTEL parent span for CLI ✅
  - Keep the parent CLI span (`cli.publish-new-task`) so the Kafka producer span is a child and carries trace context ✅
  - Log `traceId`/`spanId` after send for quick verification ✅

## Benefits
- DTO alignment: No stray `correlationId` fields ✅
- Correct correlation: Rely on OTEL `traceId`/`spanId` ✅
- Cleaner script: Minimal headers; simple to run and validate ✅

## Tests
- [x] Run the script and confirm message is consumed and spans are connected in the trace backend
- [x] Verify no `correlation_id` header is sent
- [x] Confirm console shows `traceId` and `spanId` for the CLI span

## Checklist
- [x] Remove `correlation_id` from headers
- [x] Stop using `correlationId` as Kafka `key`
- [x] Keep/confirm OTEL parent span creation
- [x] Print `traceId` and `spanId` in output
- [x] Add/keep optional W3C flags only if DTO requires
- [x] Update status to Completed

## Notes
- This job must follow J5 (DTO Validation) to ensure header shape matches the validated contract. ✅
- Script now uses `messageId` (UUID) as Kafka key instead of correlationId
- Added optional `--traceparent` and `--tracestate` CLI arguments for W3C trace context injection
- Enhanced logging to show trace details and message flow
- Added validation for W3C traceparent format

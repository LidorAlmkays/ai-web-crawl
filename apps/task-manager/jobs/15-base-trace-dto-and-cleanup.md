# Job J15: Base Trace DTO (W3C) + CorrelationId Cleanup

Status: ✅ Completed
Priority: High
Dependencies: J5 (DTO Validation), J11 (Logging Policy)
ETA: 1 hour

## Summary
Introduce a reusable `BaseTraceHeaderDto` with optional W3C trace headers and refactor header DTOs to extend it. Remove all leftover `correlationId`/`correlation_id` configs and comments.

## Design
- `BaseTraceHeaderDto` (new):
  - `traceparent?: string` with W3C regex validation and max length
  - `tracestate?: string` with max length (W3C recommends <= 512 chars)
- All Kafka header DTOs that may carry trace headers will `extends BaseTraceHeaderDto`.
- Keep these fields optional (auto-instrumentation injects/reads headers automatically). Validation only applies when present.

## Files to Add
- `src/common/dtos/trace/base-trace-header.dto.ts`

## Files to Modify
- `src/infrastructure/messaging/kafka/dtos/web-crawl-request.dto.ts`
- Any `src/api/kafka/dtos/headers/*.dto.ts` that currently define `traceparent`/`tracestate`
- Remove leftover `correlationId` comments/vars/configs if any

## Detailed Steps
1. Create `BaseTraceHeaderDto`:
   - Decorators: `@IsOptional()`, `@IsString()`, `@MaxLength(512)` and `@Matches()` for `traceparent`
   - JSDoc explaining optionality and W3C standard
   - Export type alias
2. Update header DTOs:
   - `export class XHeaderDto extends BaseTraceHeaderDto { ... }`
   - Remove local `traceparent`/`tracestate` definitions
3. Cleanup:
   - Remove any leftover `correlationId` comments/vars/envs
4. Build & lint

## Validation Rules (W3C)
- `traceparent` regex: `^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$`
- `tracestate` length: `<= 512`

## Verification
- Build succeeds
- Messages without headers still validate
- If headers exist, they validate correctly

## Checklist
- [ ] BaseTraceHeaderDto added
- [ ] Header DTOs extend base
- [ ] CorrelationId remnants removed
- [ ] Build green

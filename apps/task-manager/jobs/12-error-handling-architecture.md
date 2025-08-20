# Job J12: Error Handling Architecture (Infra → App → API)

Status: ⏭️ Skipped (Complexity Reduction)
Priority: High
Dependencies: J11 (Logging Policy)
ETA: 1-2 hours

## Summary
Establish a clear error-handling strategy:
- Infrastructure throws typed/retriable errors with minimal details.
- Application layer maps infra errors to business errors (domain language).
- API layer returns user-friendly messages and appropriate HTTP codes.
- All errors are logged with trace context; no stack traces to users.

## Deliverables
- Error base types:
  - `InfrastructureError`, `DatabaseError`, `MessagingError` (infra)
  - `BusinessError` with categories: `Validation`, `NotFound`, `Conflict`, `Processing`, `Unexpected` (app)
- Mappers in app layer to translate infra→business.
- API response helpers to format user-facing errors.

## Files to Modify / Add
- Add: `src/common/errors/*.ts` (base classes, guards)
- Update: `src/infrastructure/**` to throw typed infra errors
- Update: `src/application/**` to catch, map, and rethrow `BusinessError`
- Update: `src/api/rest/**` and Kafka handlers to format responses/logs

## Implementation Steps
1. Define error types (classes/enums) and type-guards.
2. Update Postgres adapter to throw `DatabaseError` (with safe metadata).
3. Update Kafka publisher/consumer to throw `MessagingError`.
4. Update application services to map infra errors → `BusinessError`.
5. Update REST routes and Kafka handlers to log error + return friendly message.

## Examples
- Database unique violation → `BusinessError(Conflict, 'Task already exists')`.
- Connection error → `BusinessError(Processing, 'Service temporarily unavailable')`.

## Verification
- Simulate DB/Kafka failures; confirm user-facing messages are friendly and logs contain full error context.

## Checklist
- [ ] Error base types implemented
- [ ] Infra adapters throwing typed errors
- [ ] App mappers in place
- [ ] REST/Kafka endpoints return friendly messages
- [ ] Tests: simulated failures path

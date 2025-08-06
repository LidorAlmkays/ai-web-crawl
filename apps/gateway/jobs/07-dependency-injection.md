# Job 7 (Final): Dependency Injection

**Status**: ✅ COMPLETED

## Objective

Wire up all the services and adapters in `app.ts` and verify the application starts correctly.

---

## Tasks

### 1. Update `app.ts`

- Instantiate all services, adapters, handlers, and consumers.
- Inject all dependencies correctly as defined in previous jobs.
- Ensure the `CrawlResponseConsumer` is started in the application's `start` method.

---

## Verification

- `app.ts` is fully updated with all dependency wiring.
- The application starts and stops without errors.
- **Run all tests** to ensure no regressions were introduced (`npx nx test gateway`).
- The project builds successfully (`npx nx build gateway`).

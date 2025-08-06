# Job 4 (New): State Persistence Infrastructure (Redis)

**Status**: ✅ COMPLETED

## Objective

Create and **test** the infrastructure components for persisting the state of active crawl requests using **Redis**.

---

## Tasks

### 1. Update `docker-compose.yml`

- Add a `redis` service to the Docker Compose file.

### 2. Install Dependencies

- Add `ioredis` to the project.

### 3. Add Configuration

- Create `apps/gateway/src/config/redis.ts` and add it to the main `config/index.ts`.

### 4. Create Infrastructure Port

- **File**: `apps/gateway/src/infrastructure/ports/crawl-state-repository.port.ts`

### 5. Create and Test Infrastructure Adapter (Redis)

- **File**: `apps/gateway/src/infrastructure/persistence/redis/crawl-state.repository.adapter.ts`
- **Test File**: `apps/gateway/src/infrastructure/persistence/redis/crawl-state.repository.adapter.spec.ts`
  - **Integration Test**:
    - **Setup**: Use `testcontainers` to spin up a live Redis instance.
    - **Action**: Instantiate the `RedisCrawlStateRepositoryAdapter` and connect it to the test container.
    - **Test**: `save`, `findByHash`, and `delete` operations.

---

## Verification

- All implementation and test files are created.
- All tests pass (`npx nx test gateway`).
- The project builds successfully (`npx nx build gateway`).

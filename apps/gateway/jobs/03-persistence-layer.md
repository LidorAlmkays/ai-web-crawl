# Job 03: Persistence Layer Implementation

## Objective

Create the new repository port and adapter responsible for persisting `CrawlRequest` entities in Redis, keyed by the user's email.

## Tasks

1.  **Create Repository Port:**

    - Create a new file: `apps/gateway/src/application/ports/crawl-request-repository.port.ts`
    - Define an interface `ICrawlRequestRepositoryPort` with the following methods:
      - `save(request: CrawlRequest): Promise<void>`
      - `update(request: CrawlRequest): Promise<void>`
      - `findById(email: string, id: string): Promise<CrawlRequest | null>`
      - `findByEmail(email: string): Promise<CrawlRequest[]>`

2.  **Implement Repository Adapter:**

    - Create a new file: `apps/gateway/src/infrastructure/persistence/redis/crawl-request.repository.adapter.ts`
    - Create a class `CrawlRequestRepositoryAdapter` that implements `ICrawlRequestRepositoryPort`.
    - Inject an `ioredis` client instance via the constructor.
    - **Implement the methods:**
      - `save(request)`:
        - Construct the Redis key: `crawls:{request.email}`.
        - Use `HSET` to store the JSON-stringified `request` object in the hash, with the `request.id` as the field.
      - `update(request)`:
        - This will be identical to `save`, as `HSET` will overwrite the existing field.
      - `findById(email, id)`:
        - Construct the key `crawls:{email}`.
        - Use `HGET` to retrieve the request by its `id`.
        - Parse the JSON string back into a `CrawlRequest` object. Return `null` if not found.
      - `findByEmail(email)`:
        - Construct the key `crawls:{email}`.
        - Use `HVALS` to get all crawl request objects for the user.
        - Parse each JSON string in the resulting array into a `CrawlRequest` object.

3.  **Add Test File for Adapter:**
    - Create `apps/gateway/src/infrastructure/persistence/redis/__tests__/crawl-request.repository.adapter.spec.ts`.
    - Write unit tests for the `CrawlRequestRepositoryAdapter`.
    - Use a mock Redis client (e.g., `ioredis-mock`) to test the logic without connecting to a real Redis instance.
    - Test all methods: `save`, `update`, `findById`, and `findByEmail`.

## Key Considerations & Checks

- **Error Handling:** In your adapter methods, wrap the Redis calls in `try...catch` blocks. If a Redis command fails, log the error and re-throw a custom application-level exception (e.g., `PersistenceError`). This decouples the application from infrastructure-specific errors.
- **Serialization/Deserialization:** Pay close attention to the `JSON.stringify` and `JSON.parse` calls. A failure here (e.g., trying to parse invalid JSON) should be handled gracefully. Consider adding a check to ensure the data from Redis is valid before parsing.
- **Redis Key Schema:** The key schema `crawls:{email}` is critical. Ensure it's applied consistently across all methods. A mismatch will lead to data not being found.
- **Testing Edge Cases:** In your unit tests, cover scenarios like:
  - `findById` for a non-existent ID or email (should return `null`).
  - `findByEmail` for a user with no requests (should return an empty array `[]`).
  - Saving a request that contains special characters to ensure serialization is robust.
- **Redis Connection:** The adapter should receive a _connected_ Redis client. The responsibility for managing the Redis connection lifecycle (connecting, disconnecting, handling errors) should lie outside the repository, typically in `app.ts` or a dedicated client module.

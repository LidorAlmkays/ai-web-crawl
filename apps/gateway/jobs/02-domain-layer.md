# Job 02: Domain Layer Refactoring

## Objective

Update the domain entities and create necessary enums to support the new user-centric, stateful crawl request model.

## Tasks

1.  **Create `CrawlStatus` Enum:**

    - Create a new file: `apps/gateway/src/domain/enums/crawl-status.enum.ts`
    - Define a `CrawlStatus` enum with the following string values:
      - `PENDING = 'pending'`
      - `IN_PROGRESS = 'in_progress'`
      - `COMPLETED = 'completed'`
      - `FAILED = 'failed'`
    - Export the enum.

    ```typescript
    // apps/gateway/src/domain/enums/crawl-status.enum.ts
    export enum CrawlStatus {
      PENDING = 'pending',
      IN_PROGRESS = 'in_progress',
      COMPLETED = 'completed',
      FAILED = 'failed',
    }
    ```

2.  **Update `CrawlRequest` Entity:**

    - Open the file: `apps/gateway/src/domain/entities/crawl-request.entity.ts`
    - Import the new `CrawlStatus` enum.
    - Add the following properties to the `CrawlRequest` class:
      - `email: string`: The email of the user who submitted the request.
      - `status: CrawlStatus`: The current status of the crawl.
      - `result?: any`: An optional field to store the result data of a completed crawl.
    - Update the constructor to accept and initialize these new properties. The `status` should default to `PENDING` if not provided.

3.  **Create `CrawlRequest` DTO (Optional but Recommended):**
    - Create a new file: `apps/gateway/src/domain/dtos/crawl-request.dto.ts`
    - Define a `CrawlRequestDto` class that mirrors the structure of the `CrawlRequest` entity. This helps in standardizing data transfer across layers.
    - Use `class-validator` decorators if you want to enforce validation, although for internal DTOs it may not be strictly necessary.

## Key Considerations & Checks

- **Immutability:** When updating the `CrawlRequest` entity, ensure that its core properties like `id` and `createdAt` remain immutable after creation. The constructor is the right place to set them.
- **Default Status:** Double-check that new `CrawlRequest` instances are assigned a `status` of `CrawlStatus.PENDING` by default in the constructor. This prevents requests from being in an ambiguous state.
- **Type Safety:** For the `result` field, consider defining a more specific type than `any` if the structure of the crawl result is known. For example, `result?: { title: string; content: string; }`. This will improve type safety throughout the application.
- **Entity vs. DTO:** Be mindful of the distinction. The `CrawlRequest` **entity** contains business logic and represents the core domain model. The **DTO** is a simple data container for transferring state, especially for the API layer.

# Job 05: Application Layer - Core Logic Refactoring

## Objective

Refactor the core application services (`WebscrapeService`, `ProcessCrawlResponseService`) to integrate the new persistence and connection management logic.

## Tasks

1.  **Refactor `WebscrapeService`:**

    - Open `apps/gateway/src/application/services/webscrape.service.ts`.
    - Inject `ICrawlRequestRepositoryPort` into the constructor.
    - Modify the `webscrape` method (or equivalent):
      - It should now accept `email` as a parameter along with the `url`.
      - Instead of just creating a `CrawlRequest` entity and publishing it, it should first **save the request to the repository**.
      - Create a `CrawlRequest` instance, setting its `email`, `url`, and an initial `status` of `PENDING`.
      - Call `this.crawlRequestRepository.save(newRequest)`.
      - Then, proceed with publishing the request to the Kafka topic as before.

2.  **Refactor `ProcessCrawlResponseService`:**

    - Open `apps/gateway/src/application/services/process-crawl-response.service.ts`.
    - Inject `ICrawlRequestRepositoryPort` and `IConnectionManagerPort`. The `IUserNotificationPort` should already be there.
    - Modify the `process` method (or equivalent):
      - The incoming Kafka message should contain the original `CrawlRequest` payload, including its `id` and `email`.
      - **Update the request in the repository:**
        - Fetch the existing request using `this.crawlRequestRepository.findById(email, id)`.
        - If not found, log an error and stop.
        - Update its `status` to `COMPLETED` (or `FAILED` if the response indicates an error) and set the `result` field with the response data.
        - Save the updated request back using `this.crawlRequestRepository.update(updatedRequest)`.
      - **Notify the user (if online):**
        - Use `this.connectionManager.getConnectionByEmail(email)` to check for an active WebSocket connection.
        - If a connection exists, use the `IUserNotificationPort` to send a `crawl_update` message with the `updatedRequest` payload to that specific user.

3.  **Update Test Files:**
    - Update the spec files for both services (`webscrape.service.spec.ts`, `process-crawl-response.service.spec.ts`).
    - Provide mock implementations for the new repository and connection manager ports.
    - Adjust the tests to verify that the repository methods are called correctly and that the notification logic correctly checks for an online user.

## Key Considerations & Checks

- **Transactional Integrity:** The `WebscrapeService` now has two steps: save to Redis, then publish to Kafka. This is not a true transaction. Consider the failure mode: what if the save to Redis succeeds, but the Kafka publish fails? The request would be stuck in a `PENDING` state. For a highly critical system, you might implement an outbox pattern, but for this use case, ensure robust logging is in place for any Kafka publishing failures.
- **Idempotency in `ProcessCrawlResponseService`:** Kafka messages can sometimes be delivered more than once. The logic for processing a response should be idempotent. Since we are fetching the request and updating its state, if the same completion message arrives twice, the second one should not cause harm. The state will simply be set to `COMPLETED` again.
- **Data Consistency:** Ensure the payload sent to Kafka by `WebscrapeService` contains all the necessary information for `ProcessCrawlResponseService` to function, specifically the `id` and `email` of the request.
- **Separation of Concerns:** `ProcessCrawlResponseService` now does two things: updates state and sends notifications. This is acceptable. The notification logic is cleanly separated via the `IUserNotificationPort` and `IConnectionManagerPort`. Verify that the service _only_ checks if the user is online; it should not contain any WebSocket-specific sending logic itself.
- **Testing Notification Logic:** In the tests for `ProcessCrawlResponseService`, create two main scenarios:
  1.  User is online: `connectionManager.getConnectionByEmail` returns a mock WebSocket. Assert that `userNotificationPort.send` is called.
  2.  User is offline: `connectionManager.getConnectionByEmail` returns `undefined`. Assert that `userNotificationPort.send` is **not** called.

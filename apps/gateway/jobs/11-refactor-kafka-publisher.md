# Job 11: Refactor Kafka Publisher

## Objective

Update the `KafkaCrawlRequestPublisherAdapter` and its corresponding port to publish crawl request messages according to the new data contract defined in `10-refactor-kafka-contracts.md`.

## Tasks

1.  **Update `ICrawlRequestPublisherPort`:**

    - Open `apps/gateway/src/infrastructure/ports/crawl-request-publisher.port.ts`.
    - The signature is already expecting the full `CrawlRequest` JSON, which is perfect as it contains all the necessary data (id, email, url, createdAt). No change is needed for the port itself, but we will now use its properties differently.

2.  **Update `KafkaCrawlRequestPublisherAdapter`:**

    - Open `apps/gateway/src/infrastructure/messaging/kafka/crawl-request.publisher.adapter.ts`.
    - Modify the `publish` method.
    - **Construct the Headers:** Create a `headers` object containing `id`, `email`, and `createdAt` from the `data` argument.
    - **Construct the Value:** Create a `value` object containing only the `url`.
    - **Update `producer.send` call:**
      - The `key` should be `data.id`.
      - The `value` should be the JSON string of the new minimal body.
      - Add the `headers` object to the message.

3.  **Update Unit Tests:**
    - Open `apps/gateway/src/application/services/__tests__/webscrape.service.spec.ts`.
    - The `WebscrapeService` now passes the full `CrawlRequest` JSON to the publisher. The test should be updated to reflect that the publisher receives this full object.
    - You will need a new test for the adapter itself to verify it constructs the headers and body correctly. Create `apps/gateway/src/infrastructure/messaging/kafka/__tests__/crawl-request.publisher.adapter.spec.ts`.

## Key Considerations & Checks

- **Header Serialization:** Kafka headers must be strings or buffers. Ensure all values in the `headers` object are correctly converted to strings before sending (e.g., `data.createdAt.toISOString()`).
- **Data Consistency:** It is critical that the `id` in the key, the `id` in the header, and the `id` of the request saved in Redis are all identical. A mismatch will break the entire lookup flow.
- **Error Handling:** The existing error handling for Kafka publish failures is still valid and should be maintained. If the message fails to send, the application should know about it.
- **Downstream Impact:** This change directly affects the crawl worker service. The worker must be updated to read the `id`, `email`, and `createdAt` from the message headers and the `url` from the message body.

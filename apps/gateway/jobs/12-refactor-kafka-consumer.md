# Job 12: Refactor Kafka Consumer and DTOs

## Objective

Update the `CrawlResponseConsumer` and its DTO to process crawl response messages according to the new data contract.

## Tasks

1.  **Update `CrawlResponseMessageDto`:**

    - Open `apps/gateway/src/api/kafka/dtos/crawl-response-message.dto.ts`.
    - **Remove the nested `originalRequest` object.** The DTO should now only validate the fields present in the message _body_.
    - The DTO will now only have `success` (boolean), `scrapedData` (optional), and `errorMessage` (optional).

2.  **Update `CrawlResponseConsumer`:**

    - Open `apps/gateway/src/api/kafka/crawl-response.consumer.ts`.
    - Modify the `handleMessage` method.
    - **Extract Data from Headers:**
      - Get `id`, `email`, and `createdAt` directly from `message.headers`.
      - Add robust checks to ensure these headers exist and are valid strings. If any are missing, log an error and discard the message.
    - **Process the Body:**
      - Parse and validate the message `value` (the body) against the simplified `CrawlResponseMessageDto`.
    - **Update `processCrawlResponseService.execute` call:**
      - Pass the `id` and `email` from the headers, and the `success`, `result` (`scrapedData`), and `errorMessage` from the body.

3.  **Update `ProcessCrawlResponseService` and its Port:**

    - The service's `execute` signature is already close to what's needed. However, it expects a `url` which is no longer in the response message.
    - Open `apps/gateway/src/application/ports/process-crawl-response.port.ts` and `apps/gateway/src/application/services/process-crawl-response.service.ts`.
    - **Remove the `url` parameter** from the `execute` method signature. The service can fetch the URL from the `CrawlRequest` object it retrieves from Redis. This makes the service more self-contained.

4.  **Update Unit Tests:**
    - Update `apps/gateway/src/application/services/__tests__/process-crawl-response.service.spec.ts`.
    - The test data for the `execute` method will no longer include a `url`.
    - You will need a new test for the consumer itself (`apps/gateway/src/api/kafka/__tests__/crawl-response.consumer.spec.ts`) to verify it correctly reads headers and the body.

## Key Considerations & Checks

- **Header Deserialization:** Kafka headers are received as buffers. They must be converted to strings using `.toString()` before use.
- **Missing Headers:** A response message arriving without the required `id` or `email` header is an unrecoverable error for that message. It cannot be processed. Your logic must be defensive and log these cases clearly.
- **Service Logic:** By removing `url` from the `execute` method's parameters, the `ProcessCrawlResponseService` becomes more robust. It relies on its own repository to get the full state of the request, which is a good practice. Ensure the service correctly handles the case where the request is _not_ found in Redis (it should log an error and stop).
- **Data Flow:** Trace the full data flow mentally: The `id` and `email` are added to headers by the publisher, passed through Kafka, read from headers by the consumer, and then used to look up the request in Redis. Any break in this chain will cause the system to fail.

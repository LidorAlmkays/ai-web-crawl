# Job 10: Specification for New Kafka Data Contracts

## Objective

Define the exact structure for Kafka messages for both crawl requests and crawl responses. This document will serve as the source of truth for the refactoring process.

---

### 1. Crawl Request Message (gateway -> worker)

This is the message the `gateway` service publishes to initiate a crawl.

- **Topic:** `crawl-requests` (no change)
- **Message Key:** The unique `id` of the `CrawlRequest` entity (e.g., a UUID).

- **Message Headers:**

  - `id`: The unique `id` of the `CrawlRequest` (string, identical to the key).
  - `email`: The email of the user who initiated the request (string).
  - `createdAt`: The ISO 8601 timestamp of when the request was created (string).

- **Message Value (Body):** A JSON object containing only the URL to be crawled.
  ```json
  {
    "url": "https://example.com"
  }
  ```

### 2. Crawl Response Message (worker -> gateway)

This is the message the crawl worker will publish back to the gateway upon completion or failure.

- **Topic:** `crawl-responses` (no change)
- **Message Key:** The unique `id` of the original `CrawlRequest` entity.

- **Message Headers:**

  - `id`: The `id` from the original request header.
  - `email`: The `email` from the original request header.
  - `createdAt`: The `createdAt` timestamp from the original request header.

- **Message Value (Body):** A JSON object containing the result of the crawl.
  - **On Success:**
    ```json
    {
      "success": true,
      "scrapedData": { ... } // or a string, depending on the worker's output
    }
    ```
  - **On Failure:**
    ```json
    {
      "success": false,
      "errorMessage": "The reason for the failure (e.g., 'Request timed out')."
    }
    ```

### 3. Redis Storage Structure (No Change)

The Redis storage structure will **remain the same** as it is well-suited for the new lookup requirements.

- **Key:** `crawls:{email}` (e.g., `crawls:lidor@gmail.com`)
- **Type:** Hash
- **Field/Key within Hash:** The `CrawlRequest` `id`.
- **Value within Hash:** The JSON string of the full `CrawlRequest` entity, including its `status` and `result`.

  ```
  HGET "crawls:lidor@gmail.com" "38e9351d-ab05-428b-a6ec-ddd100678807"
  => '{"id":"...", "url":"...", "email":"...", "status":"pending", "result":null, "createdAt":"..."}'
  ```

This structure allows the gateway to efficiently find the user's request map by `email` and then update the specific request by its `id` when a response comes in.

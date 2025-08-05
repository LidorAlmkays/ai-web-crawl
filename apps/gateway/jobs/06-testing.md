# Job 6: Testing

**PRD Reference**: 4.0
**Status**: Pending

## Objective

To ensure the quality, correctness, and robustness of the application through a comprehensive testing strategy that includes unit, integration, and end-to-end (E2E) tests.

## Tasks

### 1. Unit Tests

- **Focus**: `application` and `domain` layers.
- **Files to Test**:
  - `application/services/hash-generator.service.ts`:
    - **Scenario**: Given a query and URL, does it produce the expected, consistent SHA-256 hash?
    - **Edge Cases**: Test with empty strings, special characters, and very long strings.
  - `application/use-cases/handle-webscrape.use-case.ts`:
    - **Scenario**: Does it correctly call the `hashGenerator` and the `crawlRequestPublisher`?
    - **Action**: Mock `ICrawlRequestPublisher` and `HashGeneratorService`. Verify that the `publish` method on the mock publisher is called exactly once with the correctly hashed data.
- **Location**: `apps/gateway/src/application/**/__tests__/*.spec.ts`

### 2. Integration Tests

- **Focus**: Interaction between layers.
- **Tests**:
  - **WebSocket API to Application**:
    - **Scenario**: When the `webscrape.handler.ts` receives a valid message, does it correctly invoke the `IWebscrapeUseCase`?
    - **Action**: Mock the `IWebscrapeUseCase`. Send a message to the handler and assert that the `execute` method on the mock use case is called with the correct payload.
  - **Application to Kafka Infrastructure**:
    - **Scenario**: Does the `handle-webscrape.use-case.ts`, when executed, result in a message being published by `send-crawl-request.adapter.ts`?
    - **Action**: This is a more complex test. You can mock the underlying `kafkajs` client within the `KafkaCrawlRequestPublisherAdapter` to verify its `send` method is called correctly without needing a running Kafka instance.
- **Location**: `apps/gateway/src/infrastructure/**/__tests__/*.spec.ts` and `apps/gateway/src/api/**/__tests__/*.spec.ts`

### 3. End-to-End (E2E) Test

- **Focus**: The entire application flow.
- **Scenario**:
  1. Start the entire gateway application (`server.ts`).
  2. Use a WebSocket client (from a test script) to connect to the server and send a valid `webscrape` message.
  3. Use a Kafka client (from a test script) to consume from the `crawl-requests` topic.
  4. **Assert**: The message consumed from Kafka matches the expected format and contains the correct data and hash from the WebSocket message.
- **Location**: `apps/gateway-e2e/src/gateway/gateway.spec.ts`

## Verification

- All tests should pass.
- Achieve a high code coverage percentage, particularly for the application layer.

## Next Step

Project completion.

# Job 08: End-to-End (E2E) Testing

## Objective

Create a new E2E test suite to validate the complete user-centric WebSocket flow, from authentication to submitting a crawl and receiving updates.

## Tasks

1.  **Create New E2E Test File:**

    - Create a new file in the E2E project: `apps/gateway-e2e/src/gateway/user-flow.spec.ts`

2.  **Write Test Scenarios:**
    - Use a WebSocket client library (like `ws`) to connect to the server in your tests.
    - **Scenario 1: Authentication and Initial State Sync**
      - Connect a WebSocket client.
      - Send an `auth` message with a test email.
      - Assert that the server sends back any pre-existing crawl requests for that user (you may need to seed the Redis database for this test). Ensure they arrive as separate `crawl_update` messages.
    - **Scenario 2: Submitting a Crawl Request**
      - Authenticate as a user.
      - Send a `submit_crawl` message.
      - Listen for the `crawl_update` message confirming the request is `pending` or `in_progress`.
    - **Scenario 3: Receiving Real-time Updates**
      - Authenticate and submit a crawl.
      - In the test, manually trigger a mock Kafka message that simulates a crawl completion.
      - Assert that the connected client receives a `crawl_update` message with the `completed` status and result.
    - **Scenario 4: Unauthenticated User**
      - Connect a WebSocket client.
      - Send a `submit_crawl` message _without_ authenticating first.
      - Assert that the server closes the connection.
    - **Scenario 5: Reconnection**
      - Connect client A with `user@test.com`.
      - Connect client B with `user@test.com`.
      - Assert that client A's connection is closed.
    - **Scenario 6: Offline Completion and Re-sync**
      - Submit a crawl request and then disconnect the client.
      - Trigger the completion of the crawl.
      - Reconnect the client and authenticate.
      - Assert that the client immediately receives the `crawl_update` for the request that completed while they were offline.

## Setup and Teardown

- Use the `beforeAll` or `beforeEach` hooks in your test suite to connect to Redis and clear any data related to your test users to ensure tests are isolated.
- Ensure the gateway server is running before executing the E2E tests.

## Key Considerations & Checks

- **Test Isolation:** This is the most critical aspect of E2E testing. Use a unique email for each test file (e.g., `user-flow-1@test.com`) and **always** clean up the Redis data for that user in an `afterAll` or `afterEach` hook. Failure to do so will cause tests to bleed into one another.
- **Asynchronous Operations:** All WebSocket interactions are asynchronous. Use `async/await` and Promises correctly to wait for messages. You may need to wrap message listeners in Promises that resolve when the expected message arrives or reject on a timeout.
- **Mocking Downstream Systems:** For the "Receiving Real-time Updates" test, you are not testing Kafka itself. Your test should focus on the gateway's behavior. The best approach is to have a test-only REST endpoint or another mechanism on your gateway server that allows your E2E test to directly inject a message into the `ProcessCrawlResponseService`, simulating a message arrival from Kafka.
- **Timing and Timeouts:** E2E tests can be flaky due to timing issues. Use reasonable timeouts for waiting for messages, but don't make them too long, or your test suite will be slow. If a test is consistently timing out, it likely points to a bug in the application logic.
- **Configuration:** Your E2E test setup should point to the correct WebSocket server URL and port. This should be configurable and not hard-coded.
- **Server State:** Ensure the gateway server is fully started and initialized _before_ any tests run. The `globalSetup` function in your Jest configuration is the perfect place for this.

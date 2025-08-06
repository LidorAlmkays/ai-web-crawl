# Job 8 (Final): End-to-End Test

**Status**: ✅ COMPLETED

## Objective

Perform a full, end-to-end test of the entire stateful workflow to ensure all components work together correctly.

---

## E2E Test Plan

### 1. Create E2E Test File

- **File**: `apps/gateway-e2e/src/gateway/gateway.spec.ts`

### 2. Test Flow

1.  **Setup**:
    - Use `testcontainers` to start a live Kafka broker.
    - Start the entire Gateway application (`server.ts`).
    - Create a WebSocket test client and connect it to the server.
    - Create a Kafka test producer and consumer.
2.  **Action**:
    - The WebSocket client sends a `webscrape` message.
    - The test listens with its Kafka consumer on the `crawl-requests` topic.
3.  **Assert 1**:
    - Verify the crawl request message appears in Kafka with the correct payload and a generated hash.
4.  **Action 2**:
    - The Kafka test producer sends a mock response message to the `crawl-responses` topic, using the `hash` from the previous step as the message key.
5.  **Assert 2**:
    - Verify the WebSocket client receives a `result` message containing the mock response data.

---

## Verification

- The E2E test passes, validating the entire round-trip flow.
- All previous unit and integration tests still pass.

# Job 6 (New): Notification Infrastructure

**Status**: ✅ COMPLETED

## Objective

Create and **test** the infrastructure components for sending notifications back to the client.

---

## Tasks

### 1. Create Infrastructure Port

- **File**: `apps/gateway/src/infrastructure/ports/user-notification.port.ts`

### 2. Create and Test Infrastructure Adapter (WebSocket)

- **File**: `apps/gateway/src/infrastructure/notification/websocket/user-notification.adapter.ts`
- **Test File**: `apps/gateway/src/infrastructure/notification/websocket/user-notification.adapter.spec.ts`
  - **Unit Test**:
    - **Setup**: Mock the `WebSocketServerManager`.
    - **Action**: Instantiate the `WebSocketUserNotificationAdapter` with the mock and call its `send` method.
    - **Assert**: Verify that the `webSocketManager.sendMessage` method was called exactly once with the correct `connectionId` and `message`.

---

## Verification

- All implementation and test files are created.
- All unit tests pass (`npx nx test gateway`).
- The project builds successfully (`npx nx build gateway`).

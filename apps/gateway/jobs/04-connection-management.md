# Job 04: Application Layer - Connection Management

## Objective

Create the port and service for managing active WebSocket connections and their association with user emails.

## Tasks

1.  **Create Connection Manager Port:**

    - Create a new file: `apps/gateway/src/application/ports/connection-manager.port.ts`
    - Define an interface `IConnectionManagerPort` with the following methods:
      - `add(email: string, connection: WebSocket): void`: Adds a new user connection.
      - `remove(connection: WebSocket): void`: Removes a connection and cleans up mappings.
      - `getConnectionByEmail(email: string): WebSocket | undefined`: Retrieves the WebSocket connection for a given email.
      - `getEmailByConnection(connection: WebSocket): string | undefined`: Retrieves the email associated with a given WebSocket connection.

2.  **Implement Connection Manager Service:**

    - Create a new file: `apps/gateway/src/application/services/connection-manager.service.ts`
    - Create a class `ConnectionManagerService` that implements `IConnectionManagerPort`.
    - **Internal State:** Use two in-memory `Map` objects for efficient, bidirectional lookups:
      - `private emailToConnection = new Map<string, WebSocket>();`
      - `private connectionToEmail = new Map<WebSocket, string>();`
    - **Implement the methods:**
      - `add(email, connection)`:
        - First, check if the `email` already exists in `emailToConnection`. If so, get the old connection, close it with a specific code (e.g., 4001 for "reconnected"), and remove it from both maps.
        - Add the new `email` and `connection` to both maps.
      - `remove(connection)`:
        - Get the `email` from `connectionToEmail` using the `connection`.
        - If an email is found, remove the entries from both maps.
      - `getConnectionByEmail(email)`:
        - Return the result of `this.emailToConnection.get(email)`.
      - `getEmailByConnection(connection)`:
        - Return the result of `this.connectionToEmail.get(connection)`.

3.  **Add Test File for Service:**
    - Create `apps/gateway/src/application/services/__tests__/connection-manager.service.spec.ts`.
    - Write unit tests for the `ConnectionManagerService`.
    - Use mock WebSocket objects to test the logic.
    - Test all scenarios, including:
      - Adding a new connection.
      - Removing a connection.
      - Looking up connections and emails.
      - Handling a new connection for an already connected email (should terminate the old one).

## Key Considerations & Checks

- **Memory Management:** Since this service holds connections in memory, it can become a memory leak if `remove` is not called reliably on every disconnection. Ensure the `ws.on('close', ...)` event in the router **always** triggers the `connectionManager.remove()` method.
- **Concurrent Access:** This service is a singleton and will be accessed by multiple WebSocket events concurrently. While Maps in Node.js are generally safe for atomic operations (`get`, `set`, `delete`), be aware that complex, multi-step operations are not atomic. The current implementation is simple enough to be safe.
- **Reconnection Logic:** The logic to handle a new connection for an existing email is critical.
  - **Verify Old Connection Removal:** In the test for this scenario, ensure you assert that the `close()` method was called on the _old_ WebSocket object.
  - **Custom Close Code:** Using a custom close code (like 4001) is good practice. It allows the client to understand why it was disconnected.
- **Scalability:** This in-memory solution works perfectly for a single-instance server. If you ever need to scale to multiple gateway instances, this state would need to be moved to a shared store like Redis to ensure all instances know about all connections. For now, the in-memory approach is appropriate.
- **Dead Connections:** A WebSocket connection might die without a proper `close` event (e.g., network failure). Implementing a ping-pong mechanism at the WebSocket level can help detect and clean up these "zombie" connections, which would otherwise lead to a memory leak.

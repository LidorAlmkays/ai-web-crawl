# Job 06: API Layer - WebSocket Routers and Handlers

## Objective

Implement the WebSocket authentication flow, create handlers for different message types, and secure the `submit_crawl` event.

## Tasks

1.  **Create `auth.dto.ts`:**

    - Create `apps/gateway/src/api/websocket/dtos/auth.dto.ts`.
    - Define an `AuthDto` class with a single property: `email: string`.
    - Use `class-validator` decorators (`@IsEmail()`, `@IsNotEmpty()`) to ensure the email is valid.

2.  **Create `auth.handler.ts`:**

    - Create `apps/gateway/src/api/websocket/handlers/auth.handler.ts`.
    - Define an `AuthHandler` class.
    - Inject `IConnectionManagerPort`, `ICrawlRequestRepositoryPort`, and `IUserNotificationPort` into its constructor.
    - Create a `handle(connection: WebSocket, data: any)` method:
      - Validate the `data` against the `AuthDto`. If invalid, close the connection.
      - Call `this.connectionManager.add(data.email, connection)`.
      - Fetch all requests for the user using `this.crawlRequestRepository.findByEmail(data.email)`.
      - **Iterate through the requests and send each one as a separate message** using `this.userNotificationPort.send(connection, { event: 'crawl_update', data: request })`.

3.  **Refactor `webscrape.handler.ts`:**

    - Modify its `handle` method to accept `email: string` and `data: any` instead of the raw `WebSocket` connection.
    - The core logic will now call `webscrapeService.webscrape(email, data.url)`.

4.  **Refactor `websocket.router.ts`:**

    - Inject all necessary dependencies: `ConnectionManager`, the new `AuthHandler`, and the refactored `WebscrapeHandler`.
    - In the `wss.on('connection', ...)` block:
      - On `message`:
        - Parse the message to get the `event` and `data`.
        - **If `event === 'auth'`:** call `authHandler.handle(ws, data)`.
        - **Else:**
          - Check if the user is authenticated by calling `connectionManager.getEmailByConnection(ws)`.
          - If no email is returned, close the connection.
          - If authenticated, route to the appropriate handler based on the `event` (e.g., if `event === 'submit_crawl'`, call `webscrapeHandler.handle(email, data)`).
      - On `close`:
        - Call `connectionManager.remove(ws)` to clean up the connection from the maps.

5.  **Update Test Files:**
    - Create spec files for the new handlers (`auth.handler.spec.ts`).
    - Update the spec file for the `webscrape.handler.ts`.
    - Mock all dependencies and test the routing logic and handler functionality thoroughly.

## Key Considerations & Checks

- **Security First:** The single most important check in the `websocket.router.ts` is verifying authentication for any event that is not `auth`. Any message from a `ws` connection that doesn't have an associated email in the `ConnectionManager` must be treated as hostile. Closing the connection immediately is the correct response.
- **Message Parsing:** The `ws.on('message', ...)` block should be wrapped in a `try...catch` block to handle malformed JSON messages. If a client sends a string that isn't valid JSON, `JSON.parse` will throw an error and crash the server if not handled.
- **Validation Logic:** In `auth.handler.ts`, ensure you are using the `validateDto` utility properly. If validation fails, do not proceed. Inform the client with an error message and close the connection.
- **Initial Sync Logic:** The process of fetching and sending all historical requests in `AuthHandler` could be time-consuming if a user has thousands of requests. For now, a simple loop is fine. For a large-scale system, you might consider pagination or streaming the results. Ensure the test for this covers a user with zero requests and a user with multiple requests.
- **Handler Decoupling:** The `websocket.router.ts` should act purely as a dispatcher. It should not contain any business logic itself, only routing logic. It decodes the message and passes control to the appropriate, dedicated handler.
- **Clear `on:close` Logic:** Double-check that the `connectionManager.remove(ws)` call is inside the `ws.on('close', ...)` callback. This is crucial for preventing memory leaks.

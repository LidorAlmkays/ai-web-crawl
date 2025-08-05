# Job 2: Configuration and Common Utilities

**PRD Reference**: 3.2, 3.3
**Status**: Pending

## Objective

To configure the application for WebSocket communication and to define common, shared utilities and types that will be used across different layers of the application.

## Tasks

### 1. Update Server Configuration

- **File to Edit**: `apps/gateway/src/config/server.ts`
- **Action**: Add a `websocketPort` to the exported `serverConfig` object.
- **Code Snippet**:
  ```typescript
  export const serverConfig = {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    websocketPort: parseInt(process.env.WEBSOCKET_PORT || '8081', 10),
  };
  ```
- **Verification**: Ensure the `websocketPort` is accessible via `config.server.websocketPort`.

### 2. Create Shared Types

- **File to Create**: `apps/gateway/src/common/types/index.ts`
- **Action**: Define the `IWebscrapeRequest` interface.
- **Code Snippet**:
  ```typescript
  export interface IWebscrapeRequest {
    query: string;
    url: string;
  }
  ```
- **Verification**: The file should exist with the correct content.

## Next Step

Proceed to **Job 3** once all tasks are completed and verified.

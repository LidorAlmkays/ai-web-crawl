# Job 1: Initial Project Setup and Refactoring

**PRD Reference**: 3.1
**Status**: Pending

## Objective

To establish the foundational directory structure and install necessary dependencies as outlined in the PRD. This job also includes relocating the existing Kafka client to its new home in the `common/clients` directory.

## Tasks

### 1. Install Dependencies

- **Action**: Open a terminal in the `webcrawling` workspace root.
- **Command**:
  ```bash
  npm install ws
  npm install --save-dev @types/ws
  ```
- **Verification**: Check `package.json` and `package-lock.json` to confirm `ws` and `@types/ws` have been added.

### 2. Create Directory Structure

- **Action**: Create the following directories and empty placeholder `*.port.ts` files within `apps/gateway/src/`.
  - `api/ports/`
  - `api/websocket/`
  - `application/ports/`
  - `application/services/`
  - `application/use-cases/`
  - `common/clients/`
  - `common/types/`
  - `domain/models/`
  - `infrastructure/kafka/`
  - `infrastructure/ports/`
- **Verification**: The directory structure should match the PRD's specification.

### 3. Relocate Kafka Client

- **Action**: Move the file `apps/gateway/src/infrastructure/messaging/kafka/kafka-client.service.ts` to `apps/gateway/src/common/clients/kafka-client.ts`.
- **Action**: Update all import statements that are broken by this file move. You will likely need to check:
  - `apps/gateway/src/app.ts` (before it is refactored)
  - `apps/gateway/src/infrastructure/api/kafka/crawl-response-consumer.ts`
- **Verification**: The application should compile successfully after the move and import updates.

## Next Step

Proceed to **Job 2** once all tasks are completed and verified.

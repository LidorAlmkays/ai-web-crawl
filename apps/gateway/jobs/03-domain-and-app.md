# Job 3 (Revised): Domain and Core Application Logic

**Status**: ✅ COMPLETED

## Objective

Implement and **unit test** the domain entities and the application logic for receiving and processing a new webscrape request.

---

## Tasks

### 1. Create and Test Domain Entities

- **File**: `apps/gateway/src/domain/entities/crawl-state.entity.ts`
- **Test File**: `apps/gateway/src/domain/entities/crawl-state.entity.spec.ts`
  - **Test**: Ensure the constructor correctly assigns `hash` and `connectionId`.

### 2. Create Application Ports

- **File**: `apps/gateway/src/application/ports/hash.port.ts`
- **File**: `apps/gateway/src/application/ports/webscrape.port.ts`

### 3. Create and Test Application Service

- **File**: `apps/gateway/src/application/services/webscrape.service.ts`
- **Test File**: `apps/gateway/src/application/services/webscrape.service.spec.ts`
  - **Unit Test**:
    - **Setup**: Mock `IHashPort`, `ICrawlStateRepositoryPort`, and `ICrawlRequestPublisherPort`.
    - **Action**: Instantiate and call `WebscrapeService.execute()`.
    - **Assert**: Verify `hashService.generate` is called once.
    - **Assert**: Verify `crawlStateRepository.save` is called once with the correct `CrawlState` object.
    - **Assert**: Verify `crawlRequestPublisher.publish` is called once with the correct `CrawlRequest` object.

---

## Verification

- All implementation and test files are created.
- All unit tests pass (`npx nx test gateway`).
- The project builds successfully (`npx nx build gateway`).

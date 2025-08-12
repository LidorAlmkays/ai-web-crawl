# Job 07: Dependency Injection and Final Wiring

## Objective

Wire up all the new and modified services and adapters in the application's composition root (`app.ts`).

## Tasks

1.  **Update `app.ts`:**

    - Open `apps/gateway/src/app.ts`.
    - **Instantiate New Services/Adapters:**
      - `const crawlRequestRepository = new CrawlRequestRepositoryAdapter(redisClient);`
      - `const connectionManager = new ConnectionManagerService();`
    - **Remove Old Instantiations:**
      - Delete the lines creating `Sha256HashService` and `CrawlStateRepositoryAdapter`.
    - **Update Service Constructors:**
      - Update the constructor for `WebscrapeService` to pass in `crawlRequestRepository`.
      - Update the constructor for `ProcessCrawlResponseService` to pass in `crawlRequestRepository` and `connectionManager`.
    - **Instantiate WebSocket Handlers:**
      - `const authHandler = new AuthHandler(connectionManager, crawlRequestRepository, userNotificationAdapter);`
      - `const webscrapeHandler = new WebscrapeHandler(webscrapeService);`
    - **Update `setupWebSocketRoutes` Call:**
      - Pass the `connectionManager`, `authHandler`, and `webscrapeHandler` to the `setupWebSocketRoutes` function. The function signature will need to be updated to accept these new parameters.

2.  **Verify Application Startup:**
    - After making the changes, attempt to run the application (`nx serve gateway`).
    - Resolve any dependency injection or compilation errors that arise. The goal is to have the application start successfully with the new architecture wired together.
    - This step does not include full E2E testing, but ensures the application is not fundamentally broken.

## Final Review

After this job, all the core components of the new architecture should be in place and wired together. The final step would be to perform end-to-end testing to ensure the entire flow works as expected.

## Key Considerations & Checks

- **Composition Root Principle:** The `app.ts` file should be the _only_ place in the application where concrete classes (`...Service`, `...Adapter`, `...Handler`) are instantiated with `new`. All other files should depend only on interfaces (ports). This is the core of Dependency Injection.
- **Check Constructor Signatures:** As you wire everything up, you will be changing the constructor signatures of several classes. Pay close attention to the order and type of arguments being passed. TypeScript will help you here, but it's good to double-check manually.
- **Environment Configuration:** The `redisClient` instantiation depends on configuration from environment variables. Make sure your local environment (`.env` file) is correctly set up so that the Redis connection can be established on startup.
- **Singleton Instances:** Ensure that services meant to be singletons (like `ConnectionManagerService` and `CrawlRequestRepositoryAdapter`) are instantiated only once in `app.ts` and the same instance is passed to all dependent components.
- **Startup Logs:** Add a `VITAL_LOG` at the end of your `app.ts` setup (e.g., "Application modules initialized successfully") to confirm that the composition root has completed its setup without crashing.

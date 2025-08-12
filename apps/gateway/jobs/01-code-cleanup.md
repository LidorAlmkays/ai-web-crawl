# Job 01: Code Cleanup and Removal

## Objective

Remove obsolete services and repository adapters related to hashing and the old crawl state management to simplify the codebase and prepare for the new implementation.

## Tasks

1.  **Delete Hash Port and Service:**

    - Delete the file: `apps/gateway/src/application/ports/hash.port.ts`
    - Delete the file: `apps/gateway/src/application/services/sha256-hash.service.ts`
    - Delete the corresponding test file: `apps/gateway/src/application/services/__tests__/sha256-hash.service.spec.ts` (if it exists).

2.  **Delete Old State Repository:**

    - Delete the file: `apps/gateway/src/infrastructure/ports/crawl-state-repository.port.ts`
    - Delete the file: `apps/gateway/src/infrastructure/persistence/redis/crawl-state.repository.adapter.ts`
    - Delete the corresponding test file for the adapter if it exists.

3.  **Update Dependency Injection:**
    - Open `apps/gateway/src/app.ts`.
    - Find where `Sha256HashService` and `CrawlStateRepositoryAdapter` are instantiated and injected.
    - Remove these instantiations and remove them from the constructor arguments of any services that depend on them.
    - This will likely cause compilation errors, which will be addressed in subsequent jobs. The goal here is just removal.

## Key Considerations & Checks

- **Check for Compilation Errors:** After deleting the files and updating `app.ts`, your IDE and the TypeScript compiler (`tsc`) should report errors about missing dependencies in other files. This is expected and confirms that the services were in use. Do not fix these errors yet; they will be resolved as we implement the new components.
- **Verify Git Status:** Use `git status` to confirm that only the intended files are marked for deletion.
- **Search for Lingering Imports:** Do a global search for the deleted filenames (e.g., `hash.port`, `sha256-hash.service`) to ensure no stray import statements are left behind.

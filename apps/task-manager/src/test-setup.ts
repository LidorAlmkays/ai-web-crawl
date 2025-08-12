/**
 * Global Test Setup Configuration
 *
 * This file contains global test setup and teardown functions that run
 * before and after all test suites in the Task Manager application.
 *
 * It ensures proper test environment configuration and cleanup.
 */

/**
 * Global test setup that runs before all test suites
 *
 * This function configures the test environment by:
 * 1. Setting NODE_ENV to 'test' to enable test-specific configurations
 * 2. Ensuring all tests run in a consistent test environment
 *
 * This setup is essential for:
 * - Enabling test-specific logging configurations
 * - Configuring test database connections
 * - Setting up mock services and external dependencies
 *
 * @example
 * ```typescript
 * // This runs automatically before all tests
 * beforeAll(() => {
 *   process.env.NODE_ENV = 'test';
 * });
 * ```
 */
beforeAll(() => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
});

/**
 * Global test teardown that runs after all test suites
 *
 * This function performs cleanup operations after all tests complete:
 * 1. Removes the NODE_ENV test configuration
 * 2. Ensures clean state for subsequent test runs
 *
 * This teardown is essential for:
 * - Preventing test environment pollution
 * - Ensuring clean state between test runs
 * - Proper cleanup of test-specific configurations
 *
 * @example
 * ```typescript
 * // This runs automatically after all tests
 * afterAll(() => {
 *   delete process.env.NODE_ENV;
 * });
 * ```
 */
afterAll(() => {
  // Clean up test environment
  delete process.env.NODE_ENV;
});

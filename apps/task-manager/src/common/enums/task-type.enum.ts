/**
 * Task Type Enumeration
 *
 * Defines the different types of tasks that can be processed by the system.
 * This enum is used to categorize tasks and determine appropriate
 * processing logic and routing.
 *
 * Currently supports web crawling tasks, but can be extended to support
 * other task types in the future.
 */
export enum TaskType {
  /**
   * Web crawling task type
   *
   * This task type represents web scraping and crawling operations.
   * Tasks of this type are processed by the web crawl task manager
   * and involve extracting data from web pages.
   */
  WEB_CRAWL = 'web-crawl',
}

import { v4 as uuidv4 } from 'uuid';

/**
 * Domain entity for web crawl requests
 * Represents a web crawl task in the domain layer
 */
export class WebCrawlRequest {
  public readonly id: string;
  public readonly userEmail: string;
  public readonly query: string;
  public readonly originalUrl: string;
  public readonly createdAt: Date;

  constructor(
    userEmail: string,
    query: string,
    originalUrl: string,
    id?: string,
    createdAt?: Date
  ) {
    this.id = id || uuidv4();
    this.userEmail = userEmail;
    this.query = query;
    this.originalUrl = originalUrl;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Create a new web crawl request
   */
  public static create(
    userEmail: string,
    query: string,
    originalUrl: string
  ): WebCrawlRequest {
    return new WebCrawlRequest(userEmail, query, originalUrl);
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): object {
    return {
      id: this.id,
      userEmail: this.userEmail,
      query: this.query,
      originalUrl: this.originalUrl,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  public static fromJSON(data: any): WebCrawlRequest {
    return new WebCrawlRequest(
      data.userEmail,
      data.query,
      data.originalUrl,
      data.id,
      new Date(data.createdAt)
    );
  }
}

export class CrawlRequest {
  constructor(
    private readonly url: string,
    private readonly query: string,
    private readonly username: string,
    private readonly hash: string,
    private readonly createdAt: Date = new Date()
  ) {
    this.validateCrawlRequest();
  }

  private validateCrawlRequest(): void {
    if (!this.url || this.url.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }
    if (!this.query || this.query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }
    if (!this.isValidUrl(this.url)) {
      throw new Error('URL must be valid');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Getters
  public getUrl(): string {
    return this.url;
  }

  public getQuery(): string {
    return this.query;
  }

  public getUsername(): string {
    return this.username;
  }

  public getHash(): string {
    return this.hash;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  // Business logic methods
  public getDisplayInfo(): string {
    return `${this.username} wants to crawl ${this.url} with query: "${this.query}"`;
  }

  public toJSON(): object {
    return {
      url: this.url,
      query: this.query,
      hash: this.hash,
    };
  }
}

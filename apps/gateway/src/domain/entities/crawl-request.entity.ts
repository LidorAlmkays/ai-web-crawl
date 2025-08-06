export class CrawlRequest {
  public readonly url: string;
  public readonly query: string;
  public readonly userId?: string;
  public readonly createdAt: Date;
  private hash: string | null = null;

  constructor(props: {
    url: string;
    query: string;
    userId?: string;
    createdAt?: Date;
  }) {
    this.url = props.url;
    this.query = props.query;
    this.userId = props.userId;
    this.createdAt = props.createdAt || new Date();
  }

  public setHash(hash: string): void {
    if (this.hash !== null) {
      throw new Error('Hash has already been set and cannot be changed.');
    }
    this.hash = hash;
  }

  public getHash(): string {
    if (this.hash === null) {
      throw new Error('Hash has not been set.');
    }
    return this.hash;
  }

  public getHashableContent(): string {
    return `${this.query}:${this.url}`;
  }

  public toJSON() {
    return {
      url: this.url,
      query: this.query,
      hash: this.hash,
      userId: this.userId,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

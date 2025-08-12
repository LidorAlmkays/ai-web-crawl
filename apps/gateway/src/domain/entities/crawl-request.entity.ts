import { CrawlStatus } from '../enums/crawl-status.enum';
import { randomUUID } from 'crypto';

export class CrawlRequest {
  public readonly id: string;
  public readonly url: string;
  public readonly email: string;
  public status: CrawlStatus;
  public result?: any;
  public readonly createdAt: Date;

  constructor(props: {
    id?: string;
    url: string;
    email: string;
    status?: CrawlStatus;
    result?: any;
    createdAt?: Date;
  }) {
    this.id = props.id || randomUUID();
    this.url = props.url;
    this.email = props.email;
    this.status = props.status || CrawlStatus.PENDING;
    this.result = props.result;
    this.createdAt = props.createdAt || new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      url: this.url,
      email: this.email,
      status: this.status,
      result: this.result,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

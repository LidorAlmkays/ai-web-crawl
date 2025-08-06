export class CrawlState {
  public readonly hash: string;
  public readonly connectionId: string;
  public readonly url: string;
  public readonly query: string;
  public readonly createdAt: Date;

  constructor(props: {
    hash: string;
    connectionId: string;
    url: string;
    query: string;
    createdAt?: Date;
  }) {
    this.hash = props.hash;
    this.connectionId = props.connectionId;
    this.url = props.url;
    this.query = props.query;
    this.createdAt = props.createdAt || new Date();
  }
}

export class CrawlState {
  public readonly hash: string;
  public readonly connectionId: string;
  public readonly createdAt: Date;

  constructor(props: { hash: string; connectionId: string; createdAt?: Date }) {
    this.hash = props.hash;
    this.connectionId = props.connectionId;
    this.createdAt = props.createdAt || new Date();
  }
}

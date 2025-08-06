import { CrawlState } from '../crawl-state.entity';

describe('CrawlState', () => {
  it('should create a crawl state instance', () => {
    const props = {
      hash: 'test-hash',
      connectionId: 'test-connection-id',
    };
    const crawlState = new CrawlState(props);

    expect(crawlState).toBeInstanceOf(CrawlState);
    expect(crawlState.hash).toBe(props.hash);
    expect(crawlState.connectionId).toBe(props.connectionId);
    expect(crawlState.createdAt).toBeInstanceOf(Date);
  });
});

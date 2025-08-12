import { Redis } from 'ioredis';
import { CrawlRequestRepositoryAdapter } from '../crawl-request.repository.adapter';
import { CrawlRequest } from '../../../../domain/entities/crawl-request.entity';
import { CrawlStatus } from '../../../../domain/enums/crawl-status.enum';

// Mock ioredis
jest.mock('ioredis', () => require('ioredis-mock'));

describe('CrawlRequestRepositoryAdapter', () => {
  let redisClient: Redis;
  let repository: CrawlRequestRepositoryAdapter;

  beforeEach(() => {
    redisClient = new (require('ioredis'))();
    repository = new CrawlRequestRepositoryAdapter(redisClient);
  });

  afterEach(async () => {
    await redisClient.flushall();
  });

  const userEmail = 'test@example.com';
  const crawlRequest = new CrawlRequest({
    email: userEmail,
    url: 'https://example.com',
  });

  it('should save a crawl request', async () => {
    await repository.save(crawlRequest);
    const result = await redisClient.hget(
      `crawls:${userEmail}`,
      crawlRequest.id
    );
    expect(result).toBe(JSON.stringify(crawlRequest.toJSON()));
  });

  it('should update a crawl request', async () => {
    await repository.save(crawlRequest);
    const updatedRequest = new CrawlRequest({
      ...crawlRequest,
      status: CrawlStatus.COMPLETED,
    });
    await repository.update(updatedRequest);
    const result = await redisClient.hget(
      `crawls:${userEmail}`,
      crawlRequest.id
    );
    expect(result).toBe(JSON.stringify(updatedRequest.toJSON()));
  });

  it('should find a crawl request by ID', async () => {
    await repository.save(crawlRequest);
    const found = await repository.findById(userEmail, crawlRequest.id);
    expect(found).toBeInstanceOf(CrawlRequest);
    expect(found?.id).toBe(crawlRequest.id);
    expect(found?.email).toBe(crawlRequest.email);
  });

  it('should return null when a crawl request is not found by ID', async () => {
    const found = await repository.findById(userEmail, 'non-existent-id');
    expect(found).toBeNull();
  });

  it('should find all crawl requests by email', async () => {
    const request1 = new CrawlRequest({
      email: userEmail,
      url: 'https://test1.com',
    });
    const request2 = new CrawlRequest({
      email: userEmail,
      url: 'https://test2.com',
    });
    await repository.save(request1);
    await repository.save(request2);

    const found = await repository.findByEmail(userEmail);
    expect(found).toHaveLength(2);
    expect(found.map((r) => r.id).sort()).toEqual(
      [request1.id, request2.id].sort()
    );
  });

  it('should return an empty array when no requests are found for an email', async () => {
    const found = await repository.findByEmail('no-requests@example.com');
    expect(found).toEqual([]);
  });
});

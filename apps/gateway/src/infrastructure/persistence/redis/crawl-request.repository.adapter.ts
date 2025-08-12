import { Redis } from 'ioredis';
import { ICrawlRequestRepositoryPort } from '../../../application/ports/crawl-request-repository.port';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';
import { logger } from '../../../common/utils/logger';

export class CrawlRequestRepositoryAdapter
  implements ICrawlRequestRepositoryPort
{
  private readonly redis: Redis;
  private readonly keyPrefix = 'crawls';

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private getKey(email: string): string {
    return `${this.keyPrefix}:${email}`;
  }

  async save(request: CrawlRequest): Promise<void> {
    const key = this.getKey(request.email);
    try {
      await this.redis.hset(key, request.id, JSON.stringify(request.toJSON()));
      logger.info(
        `Saved crawl request ${request.id} for user ${request.email}`
      );
    } catch (error) {
      logger.error(`Error saving crawl request ${request.id}:`, { err: error });
      throw new Error('Failed to save crawl request.');
    }
  }

  async update(request: CrawlRequest): Promise<void> {
    // HSET will overwrite, so this is the same as save
    await this.save(request);
  }

  async findById(email: string, id: string): Promise<CrawlRequest | null> {
    const key = this.getKey(email);
    try {
      const result = await this.redis.hget(key, id);
      if (!result) {
        return null;
      }
      const plain = JSON.parse(result);
      return new CrawlRequest({
        ...plain,
        createdAt: new Date(plain.createdAt),
      });
    } catch (error) {
      logger.error(`Error finding crawl request ${id} for user ${email}:`, {
        err: error,
      });
      throw new Error('Failed to find crawl request.');
    }
  }

  async findByEmail(email: string): Promise<CrawlRequest[]> {
    const key = this.getKey(email);
    try {
      const results = await this.redis.hvals(key);
      if (!results) {
        return [];
      }
      return results.map((res) => {
        const plain = JSON.parse(res);
        return new CrawlRequest({
          ...plain,
          createdAt: new Date(plain.createdAt),
        });
      });
    } catch (error) {
      logger.error(`Error finding crawl requests for user ${email}:`, {
        err: error,
      });
      throw new Error('Failed to find crawl requests.');
    }
  }
}

import { Redis } from 'ioredis';
import { CrawlState } from '../../../domain/entities/crawl-state.entity';
import { ICrawlStateRepositoryPort } from '../../ports/crawl-state-repository.port';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';

export class RedisCrawlStateRepositoryAdapter
  implements ICrawlStateRepositoryPort
{
  private readonly redis: Redis;
  private readonly keyPrefix = 'crawl-state:';

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  }

  public async connect(): Promise<void> {
    // ioredis connects automatically, but we can listen for the connect event
    this.redis.on('connect', () => {
      logger.info('Successfully connected to Redis');
    });
    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });
  }

  private getKey(hash: string): string {
    return `${this.keyPrefix}${hash}`;
  }

  async save(state: CrawlState): Promise<void> {
    const key = this.getKey(state.hash);
    const value = JSON.stringify(state);
    await this.redis.set(key, value);
    logger.info('Saved crawl state to Redis', { hash: state.hash });
  }

  async findByHash(hash: string): Promise<CrawlState | null> {
    const key = this.getKey(hash);
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }
    const rawState = JSON.parse(value);

    // Re-hydrate the CrawlState entity with all properties
    return new CrawlState({
      hash: rawState.hash,
      connectionId: rawState.connectionId,
      url: rawState.url,
      query: rawState.query,
      createdAt: new Date(rawState.createdAt),
    });
  }

  async delete(hash: string): Promise<void> {
    const key = this.getKey(hash);
    await this.redis.del(key);
    logger.info('Deleted crawl state from Redis', { hash });
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

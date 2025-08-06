import { CrawlState } from '../../domain/entities/crawl-state.entity';

export interface ICrawlStateRepositoryPort {
  save(state: CrawlState): Promise<void>;
  findByHash(hash: string): Promise<CrawlState | null>;
  delete(hash: string): Promise<void>;
}

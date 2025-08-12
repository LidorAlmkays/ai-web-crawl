import { CrawlRequest } from '../../domain/entities/crawl-request.entity';

export interface ICrawlRequestRepositoryPort {
  save(request: CrawlRequest): Promise<void>;
  update(request: CrawlRequest): Promise<void>;
  findById(email: string, id: string): Promise<CrawlRequest | null>;
  findByEmail(email: string): Promise<CrawlRequest[]>;
}

import { CrawlRequest } from '../domain/crawl-request.entity';
import { ICrawlRequestPublisherPort } from '../ports/gateway/crawl-request.publisher.port';
import { ISubmitCrawlRequestPort } from '../ports/application/submit-crawl-request.port';
import { logger } from '../../common/utils/logger';
import * as crypto from 'crypto';

export interface SubmitCrawlRequestRequest {
  url: string;
  query: string;
  username: string;
}

export interface SubmitCrawlRequestResponse {
  success: boolean;
  crawlRequest?: CrawlRequest;
  message?: string;
  error?: string;
}

export class SubmitCrawlRequestUseCase implements ISubmitCrawlRequestPort {
  constructor(
    private readonly crawlRequestPublisher: ICrawlRequestPublisherPort
  ) {}

  public async execute(
    request: SubmitCrawlRequestRequest
  ): Promise<SubmitCrawlRequestResponse> {
    try {
      logger.info('Submitting crawl request', {
        url: request.url,
        query: request.query,
        username: request.username,
      });

      // Generate hash from username + query + url
      const hash = this.generateHash(
        request.username,
        request.query,
        request.url
      );

      // Create crawl request
      const crawlRequest = new CrawlRequest(
        request.url,
        request.query,
        request.username,
        hash
      );

      // Publish to Kafka
      await this.crawlRequestPublisher.publishCrawlRequest(crawlRequest);

      // Print to console as requested
      console.log('=== CRAWL REQUEST SUBMITTED ===');
      console.log('URL:', crawlRequest.getUrl());
      console.log('Query:', crawlRequest.getQuery());
      console.log('Username:', crawlRequest.getUsername());
      console.log('Hash:', crawlRequest.getHash());
      console.log('Created At:', crawlRequest.getCreatedAt());
      console.log('Display Info:', crawlRequest.getDisplayInfo());
      console.log('===============================');

      logger.info('Crawl request submitted successfully', {
        hash: crawlRequest.getHash(),
        username: crawlRequest.getUsername(),
      });

      return {
        success: true,
        crawlRequest: crawlRequest,
        message: 'Crawl request submitted successfully',
      };
    } catch (error) {
      logger.error('Error submitting crawl request', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private generateHash(username: string, query: string, url: string): string {
    const combined = `${username}${query}${url}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }
}

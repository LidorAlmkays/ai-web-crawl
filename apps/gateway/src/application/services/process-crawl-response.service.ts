import { IProcessCrawlResponsePort } from '../ports/process-crawl-response.port';
import { ICrawlStateRepositoryPort } from '../../infrastructure/ports/crawl-state-repository.port';
import { IUserNotificationPort } from '../../infrastructure/ports/user-notification.port';
import { logger } from '../../common/utils/logger';
import { IWebscrapeResponseMessage } from '../../common/types';

export class ProcessCrawlResponseService implements IProcessCrawlResponsePort {
  constructor(
    private readonly crawlStateRepository: ICrawlStateRepositoryPort,
    private readonly userNotification: IUserNotificationPort
  ) {}

  async execute(data: {
    userHash: string;
    originalUrl: string;
    scrapedData: string; // Changed to string
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const { userHash } = data;
    logger.info('Processing crawl response', { userHash });

    const state = await this.crawlStateRepository.findByHash(userHash);

    if (!state) {
      logger.warn('No crawl state found for hash, cannot notify user', {
        userHash,
      });
      return;
    }

    const notificationMessage: IWebscrapeResponseMessage = {
      type: 'webscrape_result',
      data: {
        originalUrl: data.originalUrl,
        success: data.success,
        scrapedData: data.scrapedData, // Now a string
        errorMessage: data.errorMessage,
      },
      timestamp: new Date().toISOString(),
    };

    await this.userNotification.send(state.connectionId, notificationMessage);

    await this.crawlStateRepository.delete(userHash);
    logger.info('Successfully processed and cleaned up crawl state', {
      userHash,
    });
  }
}

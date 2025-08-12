import { IProcessCrawlResponsePort } from '../ports/process-crawl-response.port';
import { ICrawlRequestRepositoryPort } from '../ports/crawl-request-repository.port';
import { IUserNotificationPort } from '../../infrastructure/ports/user-notification.port';
import { IConnectionManagerPort } from '../ports/connection-manager.port';
import { logger } from '../../common/utils/logger';
import { CrawlStatus } from '../../domain/enums/crawl-status.enum';

export class ProcessCrawlResponseService implements IProcessCrawlResponsePort {
  constructor(
    private readonly crawlRequestRepository: ICrawlRequestRepositoryPort,
    private readonly connectionManager: IConnectionManagerPort,
    private readonly userNotification: IUserNotificationPort
  ) {}

  async execute(data: {
    id: string;
    email: string;
    success: boolean;
    result?: any;
    errorMessage?: string;
  }): Promise<void> {
    const { id, email } = data;
    logger.info(`Processing crawl response for request ${id}`);

    const request = await this.crawlRequestRepository.findById(email, id);

    if (!request) {
      logger.warn(`Crawl request ${id} not found, cannot process response.`);
      return;
    }

    // Update request state
    request.status = data.success ? CrawlStatus.COMPLETED : CrawlStatus.FAILED;
    request.result = data.result || { error: data.errorMessage };
    await this.crawlRequestRepository.update(request);

    // Check if user is online and notify
    const connection = this.connectionManager.getConnectionByEmail(email);
    if (connection) {
      this.userNotification.send(connection, {
        event: 'crawl_update',
        data: request.toJSON(),
      });
      logger.info(`Sent crawl_update notification to online user ${email}`);
    } else {
      logger.info(
        `User ${email} is offline, notification will be delivered upon next connection.`
      );
    }
  }
}

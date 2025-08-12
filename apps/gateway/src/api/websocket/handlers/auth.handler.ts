import { WebSocket } from 'ws';
import { IConnectionManagerPort } from '../../../application/ports/connection-manager.port';
import { ICrawlRequestRepositoryPort } from '../../../application/ports/crawl-request-repository.port';
import { IUserNotificationPort } from '../../../infrastructure/ports/user-notification.port';
import { validateDto } from '../../../common/utils/validation';
import { AuthDto } from '../dtos/auth.dto';
import { logger } from '../../../common/utils/logger';

export class AuthHandler {
  constructor(
    private readonly connectionManager: IConnectionManagerPort,
    private readonly crawlRequestRepository: ICrawlRequestRepositoryPort,
    private readonly userNotification: IUserNotificationPort
  ) {}

  async handle(connection: WebSocket, data: any): Promise<void> {
    const authDto = new AuthDto();
    authDto.email = data.email;

    const validationResult = await validateDto(AuthDto, authDto);
    if (!validationResult.isValid) {
      logger.warn('Invalid auth message received', {
        error: validationResult.errorMessage,
      });
      connection.close(4000, validationResult.errorMessage);
      return;
    }

    const { email } = authDto;
    logger.info(`Authenticating user ${email}`);
    this.connectionManager.add(email, connection);

    // Sync user with their previous requests
    const userRequests = await this.crawlRequestRepository.findByEmail(email);
    logger.info(
      `Found ${userRequests.length} requests for user ${email}, sending...`
    );

    for (const request of userRequests) {
      this.userNotification.send(connection, {
        event: 'crawl_update',
        data: request.toJSON(),
      });
    }
    logger.info(`Finished sending initial requests for user ${email}`);
  }
}

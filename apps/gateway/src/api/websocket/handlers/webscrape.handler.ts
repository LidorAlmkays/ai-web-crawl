import { IWebscrapePort } from '../../../application/ports/webscrape.port';
import { IWebSocketConnection, IWebSocketMessage } from '../../../common/types';
import { logger } from '../../../common/utils/logger';
import { validateDto } from '../../../common/utils/validation';
import { SubmitCrawlRequestDto } from '../dtos/submit-crawl-request.dto';

export class WebscrapeHandler {
  constructor(private readonly webscrapeService: IWebscrapePort) {}

  async handle(
    connection: IWebSocketConnection,
    message: IWebSocketMessage
  ): Promise<void> {
    const { data } = message;
    logger.info('Received webscrape request', {
      connectionId: connection.id,
      data,
    });

    // 1. Validate DTO from the WebSocket message
    const {
      isValid,
      data: validatedData,
      errorMessage,
    } = await validateDto(SubmitCrawlRequestDto, data);
    if (!isValid || !validatedData) {
      logger.warn('Invalid webscrape request payload', { error: errorMessage });
      return;
    }

    // 2. Create the plain object for the application service
    const requestData = {
      query: validatedData.query,
      url: validatedData.url,
      userId: connection.userId,
    };

    // 3. Execute application service
    try {
      await this.webscrapeService.execute(requestData, connection.id);
      logger.info('Webscrape service executed successfully', {
        connectionId: connection.id,
      });
    } catch (error) {
      logger.error('Error executing webscrape service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

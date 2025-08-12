import { IWebscrapePort } from '../../../application/ports/webscrape.port';
import { logger } from '../../../common/utils/logger';
import { validateDto } from '../../../common/utils/validation';
import { SubmitCrawlRequestDto } from '../dtos/submit-crawl-request.dto';
import { WebSocket } from 'ws';

export class WebscrapeHandler {
  constructor(private readonly webscrapeService: IWebscrapePort) {}

  async handle(email: string, data: any, connection: WebSocket): Promise<void> {
    logger.info(`Received webscrape request for user ${email}`, { data });

    const {
      isValid,
      data: validatedData,
      errorMessage,
    } = await validateDto(SubmitCrawlRequestDto, data);

    if (!isValid || !validatedData) {
      logger.warn(`Invalid webscrape request payload for user ${email}`, {
        error: errorMessage,
      });
      // Optionally send an error message back to the client
      connection.send(
        JSON.stringify({
          event: 'error',
          message: `Invalid payload: ${errorMessage}`,
        })
      );
      return;
    }

    try {
      await this.webscrapeService.execute({
        url: validatedData.url,
        email: email,
      });
      logger.info(`Webscrape service executed successfully for user ${email}`);
    } catch (error) {
      logger.error(`Error executing webscrape service for user ${email}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

import { Request, Response } from 'express';
import { SubmitCrawlRequestRequest } from '../../../../core/application/submit-crawl-request.usecase';
import { ISubmitCrawlRequestPort } from '../../../../core/ports/application/submit-crawl-request.port';
import {
  SubmitCrawlRequestDto,
  SubmitCrawlRequestResponseDto,
  CrawlRequestDataDto,
} from '../dtos/submit-crawl-request.dto';
import { logger } from '../../../../common/utils/logger';
import { validateDto } from '../../../../common/utils/validation';

export class CrawlController {
  private submitCrawlRequestPort!: ISubmitCrawlRequestPort;

  public setSubmitCrawlRequestPort(port: ISubmitCrawlRequestPort): void {
    this.submitCrawlRequestPort = port;
  }

  public async submitCrawlRequest(req: Request, res: Response): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      logger.info('Submit crawl request received', {
        requestId,
        body: req.body,
      });

      // Validate request body using DTO validation
      const validationResult = await validateDto(
        SubmitCrawlRequestDto,
        req.body
      );

      if (!validationResult.isValid) {
        logger.warn('DTO validation failed', {
          requestId,
          errors: validationResult.errorMessage,
        });
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: validationResult.errorMessage,
        });
        return;
      }

      // Use validated data
      const crawlData = validationResult.data!;

      // Create use case request
      const useCaseRequest: SubmitCrawlRequestRequest = {
        url: crawlData.url,
        query: crawlData.query,
        username: crawlData.username,
      };

      // Execute use case
      const result = await this.submitCrawlRequestPort.execute(useCaseRequest);

      // Create response DTO instance
      const responseDto = new SubmitCrawlRequestResponseDto();
      responseDto.success = result.success;
      responseDto.message = result.message || 'OK';

      if (result.crawlRequest) {
        const crawlRequestData = new CrawlRequestDataDto();
        crawlRequestData.url = result.crawlRequest.getUrl();
        crawlRequestData.query = result.crawlRequest.getQuery();
        crawlRequestData.username = result.crawlRequest.getUsername();
        crawlRequestData.hash = result.crawlRequest.getHash();
        crawlRequestData.createdAt = result.crawlRequest
          .getCreatedAt()
          .toISOString();
        responseDto.crawlRequest = crawlRequestData;
      }

      responseDto.error = result.error;

      if (result.success) {
        logger.info('Crawl request submitted successfully', {
          requestId,
          hash: result.crawlRequest?.getHash(),
        });
        res.status(200).json(responseDto);
      } else {
        logger.warn('Failed to submit crawl request', {
          requestId,
          error: result.error,
        });
        res.status(400).json(responseDto);
      }
    } catch (error) {
      logger.error('Unexpected error in submitCrawlRequest controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'An unexpected error occurred',
      });
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

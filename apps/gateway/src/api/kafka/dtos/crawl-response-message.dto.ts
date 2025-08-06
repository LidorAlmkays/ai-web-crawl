import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO for validating the payload of a message from the crawl-response topic.
 * This ensures the data received from Kafka is in the expected format before processing.
 */
export class CrawlResponseMessageDto {
  @IsUrl()
  originalUrl!: string;

  @IsBoolean()
  success!: boolean;

  /**
   * The direct string answer to the user's original query.
   */
  @IsString()
  scrapedData!: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}

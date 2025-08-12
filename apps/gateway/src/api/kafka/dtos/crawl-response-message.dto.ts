import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO for validating the payload of a message from the crawl-response topic.
 * This ensures the data received from Kafka is in the expected format before processing.
 */
export class CrawlResponseMessageDto {
  @IsBoolean()
  success!: boolean;

  /**
   * The direct string answer to the user's original query.
   */
  @IsString()
  @IsOptional()
  scrapedData?: any; // Allow any type for scraped data

  @IsString()
  @IsOptional()
  errorMessage?: string;
}

import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

/**
 * DTO for validating error task status message body
 * Contains the error details for a failed task
 */
export class WebCrawlErrorTaskMessageDto extends BaseWebCrawlMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  error!: string;
}

export type WebCrawlErrorTaskMessageDtoType = WebCrawlErrorTaskMessageDto;



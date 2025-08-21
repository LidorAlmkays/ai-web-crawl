import { IsString, IsNotEmpty,  MaxLength } from 'class-validator';

/**
 * DTO for validating completed task status message body
 * Contains the result data for a completed task
 */
export class WebCrawlCompletedTaskMessageDto  {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  crawl_result!: string;
}

export type WebCrawlCompletedTaskMessageDtoType = WebCrawlCompletedTaskMessageDto;



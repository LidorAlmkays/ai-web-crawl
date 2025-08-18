import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

export class WebCrawlCompletedTaskMessageDto extends BaseWebCrawlMessageDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(10000)
	crawl_result!: string;
}

export type WebCrawlCompletedTaskMessageDtoType = WebCrawlCompletedTaskMessageDto;

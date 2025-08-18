import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

export class WebCrawlErrorTaskMessageDto extends BaseWebCrawlMessageDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(10000)
	error!: string;
}

export type WebCrawlErrorTaskMessageDtoType = WebCrawlErrorTaskMessageDto;

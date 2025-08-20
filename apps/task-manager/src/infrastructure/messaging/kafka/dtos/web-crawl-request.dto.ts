import { Type } from 'class-transformer';
import {
	IsString,
	IsNotEmpty,
	IsUrl,
	IsOptional,
	IsUUID,
	MinLength,
	MaxLength,
	IsEmail,
	IsDateString,
	ValidateNested,
} from 'class-validator';

/**
 * DTO for web crawl request message headers
 * Contains task_id, timestamp, and trace context information.
 * Used for outgoing web crawl requests to Kafka (infrastructure layer).
 */
export class WebCrawlRequestHeaderDto {
	@IsUUID()
	@IsNotEmpty()
	task_id!: string;

	@IsDateString()
	@IsNotEmpty()
	timestamp!: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	traceparent?: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	tracestate?: string;
}

/**
 * DTO for web crawl request message body
 * Contains the essential web crawling parameters
 */
export class WebCrawlRequestBodyDto {
	@IsEmail()
	@IsNotEmpty()
	@MaxLength(255)
	user_email!: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(1000)
	user_query!: string;

	@IsUrl()
	@IsNotEmpty()
	@MaxLength(2048)
	base_url!: string;
}

/**
 * Complete web crawl request message DTO
 * Combines header and body with validation
 */
export class WebCrawlRequestMessageDto {
	@Type(() => WebCrawlRequestHeaderDto)
	@ValidateNested()
	headers!: WebCrawlRequestHeaderDto;

	@Type(() => WebCrawlRequestBodyDto)
	@ValidateNested()
	body!: WebCrawlRequestBodyDto;
}

// Export type aliases for convenience
export type WebCrawlRequestHeaderDtoType = WebCrawlRequestHeaderDto;
export type WebCrawlRequestBodyDtoType = WebCrawlRequestBodyDto;
export type WebCrawlRequestMessageDtoType = WebCrawlRequestMessageDto;

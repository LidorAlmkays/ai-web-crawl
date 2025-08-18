import { IsString, IsNotEmpty, IsEmail, IsUrl, MinLength, MaxLength } from 'class-validator';

/**
 * Base DTO for Kafka message bodies (web crawl)
 */
export class BaseWebCrawlMessageDto {
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

export type BaseWebCrawlMessageDtoType = BaseWebCrawlMessageDto;

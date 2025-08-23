import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for web crawl request
 * Validates incoming web crawl request data
 */
export class WebCrawlRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  userEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  query!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(2048)
  originalUrl!: string;
}

export type WebCrawlRequestDtoType = WebCrawlRequestDto;

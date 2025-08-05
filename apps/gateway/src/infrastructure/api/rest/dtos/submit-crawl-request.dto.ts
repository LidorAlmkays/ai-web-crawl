import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for submitting a crawl request
 * Validates URL format, query string, and username requirements
 */
export class SubmitCrawlRequestDto {
  @IsUrl()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  query!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  username!: string;
}

// Export type alias for the class
export type SubmitCrawlRequestDtoType = SubmitCrawlRequestDto;

/**
 * DTO for crawl request response
 * Includes success status, message, and optional crawl request data
 */
export class SubmitCrawlRequestResponseDto {
  @IsBoolean()
  success!: boolean;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  message!: string;

  @IsOptional()
  crawlRequest?: CrawlRequestDataDto;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string;
}

// Export type alias for the response DTO
export type SubmitCrawlRequestResponseDtoType = SubmitCrawlRequestResponseDto;

/**
 * Nested DTO for crawl request data
 */
export class CrawlRequestDataDto {
  @IsUrl()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  query!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(64)
  hash!: string;

  @IsDateString()
  @IsNotEmpty()
  createdAt!: string;
}

// Export type alias for the nested DTO
export type CrawlRequestDataDtoType = CrawlRequestDataDto;

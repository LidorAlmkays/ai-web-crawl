import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for crawl request data
 * Used for both API requests and Kafka messages
 */
export class CrawlRequestDto {
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
  @MinLength(32)
  @MaxLength(64)
  hash!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @IsDateString()
  @IsNotEmpty()
  timestamp!: string;
}

export type CrawlRequestDtoType = CrawlRequestDto;

/**
 * DTO for crawl response data
 * Used for Kafka response messages
 */
export class CrawlResponseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(64)
  hash!: string;

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

  @IsDateString()
  @IsNotEmpty()
  timestamp!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  result!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  status!: string;
}

export type CrawlResponseDtoType = CrawlResponseDto;

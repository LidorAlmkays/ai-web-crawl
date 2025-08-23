import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for web crawl response
 * Response sent back to the client after processing a web crawl request
 */
export class WebCrawlResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;
}

export type WebCrawlResponseDtoType = WebCrawlResponseDto;

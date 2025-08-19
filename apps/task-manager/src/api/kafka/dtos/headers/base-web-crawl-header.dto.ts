import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseTaskHeaderDto } from './base-task-header.dto';

/**
 * Base DTO for all web crawl Kafka message headers
 * Contains common metadata and trace context
 */
export class BaseWebCrawlHeaderDto extends BaseTaskHeaderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  traceparent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tracestate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  correlation_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;
}

export type BaseWebCrawlHeaderDtoType = BaseWebCrawlHeaderDto;



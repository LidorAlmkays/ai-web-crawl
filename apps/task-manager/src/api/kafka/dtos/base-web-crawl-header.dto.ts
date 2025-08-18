import { IsOptional, IsString, MaxLength, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

/**
 * Base DTO for all web crawl Kafka message headers
 * Contains common metadata and trace context
 */
export class BaseWebCrawlHeaderDto {
	@IsEnum(TaskStatus)
	@IsNotEmpty()
	status!: string;

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

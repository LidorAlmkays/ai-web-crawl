import { IsNotEmpty, IsUUID } from 'class-validator';
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * Header for task update messages (completed/error) — includes task_id
 */
export class WebCrawlTaskUpdateHeaderDto extends BaseWebCrawlHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id!: string;
}

export type WebCrawlTaskUpdateHeaderDtoType = WebCrawlTaskUpdateHeaderDto;



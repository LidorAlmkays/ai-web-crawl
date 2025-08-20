import { IsNotEmpty, IsUUID } from 'class-validator';
import { BaseTaskHeaderDto } from './base-task-header.dto';

/**
 * Header for task update messages (completed/error) — includes task_id
 */
export class WebCrawlTaskUpdateHeaderDto extends BaseTaskHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id!: string;
}

export type WebCrawlTaskUpdateHeaderDtoType = WebCrawlTaskUpdateHeaderDto;



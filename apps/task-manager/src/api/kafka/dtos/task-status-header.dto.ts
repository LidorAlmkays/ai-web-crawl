import { IsNotEmpty, IsUUID } from 'class-validator';
import { BaseTaskHeaderDto } from './base-task-header.dto';

/**
 * DTO for validating task status message headers
 * Extends BaseTaskHeaderDto with task ID for status updates
 */
export class TaskStatusHeaderDto extends BaseTaskHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

// Export type alias for the class
export type TaskStatusHeaderDtoType = TaskStatusHeaderDto;














import { IsNotEmpty, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { TaskType } from '../../../common/enums/task-type.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';

/**
 * DTO for validating task status message headers
 * Contains common metadata for all task status messages
 */
export class TaskStatusHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsEnum(TaskType)
  @IsNotEmpty()
  task_type!: string;

  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: string;

  @IsDateString()
  @IsNotEmpty()
  timestamp!: string;
}

// Export type alias for the class
export type TaskStatusHeaderDtoType = TaskStatusHeaderDto;












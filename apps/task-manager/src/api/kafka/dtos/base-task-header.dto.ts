import { IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { TaskType } from '../../../common/enums/task-type.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';

/**
 * Base DTO for all task-related message headers
 * Contains common metadata fields shared across all task message types
 */
export class BaseTaskHeaderDto {
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

export type BaseTaskHeaderDtoType = BaseTaskHeaderDto;

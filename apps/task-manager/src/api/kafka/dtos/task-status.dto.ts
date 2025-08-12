import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

/**
 * DTO for validating task status message body
 * Generic DTO for testing message structure validation
 */
export class TaskStatusDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @IsEnum(['new', 'completed', 'error'])
  status!: string;

  @IsUrl()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> = {};

  @IsOptional()
  @IsString()
  timestamp?: string;
}

// Export type alias for the class
export type TaskStatusDtoType = TaskStatusDto;

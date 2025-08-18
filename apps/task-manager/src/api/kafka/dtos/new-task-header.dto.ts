import { BaseTaskHeaderDto } from './base-task-header.dto';

/**
 * DTO for validating NEW task message headers (no id expected)
 * Extends BaseTaskHeaderDto with no additional fields
 */
export class NewTaskHeaderDto extends BaseTaskHeaderDto {
  // No additional fields needed - inherits all from BaseTaskHeaderDto
}

export type NewTaskHeaderDtoType = NewTaskHeaderDto;



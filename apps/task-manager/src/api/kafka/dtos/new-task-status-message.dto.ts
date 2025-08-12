import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for validating new task status message body
 * Contains the data needed to create a new task
 */
export class NewTaskStatusMessageDto {
  @IsEmail()
  @IsNotEmpty()
  user_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  base_url!: string;
}

// Export type alias for the class
export type NewTaskStatusMessageDtoType = NewTaskStatusMessageDto;

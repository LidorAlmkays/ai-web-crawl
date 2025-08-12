import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for validating error task status message body
 * Contains the error data for a failed task
 */
export class ErrorTaskStatusMessageDto {
  @IsEmail()
  @IsNotEmpty()
  user_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  error!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  base_url!: string;
}

// Export type alias for the class
export type ErrorTaskStatusMessageDtoType = ErrorTaskStatusMessageDto;

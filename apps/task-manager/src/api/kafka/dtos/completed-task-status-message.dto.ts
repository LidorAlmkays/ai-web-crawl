import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for validating completed task status message body
 * Contains the result data for a completed task
 */
export class CompletedTaskStatusMessageDto {
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  crawl_result!: string;
}

// Export type alias for the class
export type CompletedTaskStatusMessageDtoType = CompletedTaskStatusMessageDto;

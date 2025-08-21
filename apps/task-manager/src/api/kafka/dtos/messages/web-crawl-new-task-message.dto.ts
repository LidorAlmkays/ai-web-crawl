import { IsString, IsNotEmpty, IsEmail, IsUrl, MinLength, MaxLength } from 'class-validator';

export class WebCrawlNewTaskMessageDto {
    @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  user_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query!: string;

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  base_url!: string;
}

export type WebCrawlNewTaskMessageDtoType = WebCrawlNewTaskMessageDto;



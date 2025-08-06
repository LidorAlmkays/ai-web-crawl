import {
  IsString,
  IsNotEmpty,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SubmitCrawlRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  query!: string;

  @IsUrl()
  @IsNotEmpty()
  url!: string;
}

export type SubmitCrawlRequestDtoType = SubmitCrawlRequestDto;

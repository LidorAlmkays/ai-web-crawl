import { IsNotEmpty, IsUrl } from 'class-validator';

export class SubmitCrawlRequestDto {
  @IsUrl()
  @IsNotEmpty()
  url!: string;
}

export type SubmitCrawlRequestDtoType = SubmitCrawlRequestDto;

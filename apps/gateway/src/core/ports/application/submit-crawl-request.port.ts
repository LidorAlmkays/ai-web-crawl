import {
  SubmitCrawlRequestRequest,
  SubmitCrawlRequestResponse,
} from '../../application/submit-crawl-request.usecase';

export interface ISubmitCrawlRequestPort {
  execute(
    request: SubmitCrawlRequestRequest
  ): Promise<SubmitCrawlRequestResponse>;
}

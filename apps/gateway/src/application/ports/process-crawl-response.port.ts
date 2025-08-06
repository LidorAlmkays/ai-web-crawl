export interface IProcessCrawlResponsePort {
  execute(data: {
    userHash: string;
    originalUrl: string;
    scrapedData: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void>;
}

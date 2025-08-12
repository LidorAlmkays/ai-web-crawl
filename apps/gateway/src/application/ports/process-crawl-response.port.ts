export interface IProcessCrawlResponsePort {
  execute(data: {
    id: string;
    email: string;
    success: boolean;
    result?: any;
    errorMessage?: string;
  }): Promise<void>;
}

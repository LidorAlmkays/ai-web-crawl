import { Router } from 'express';
import { CrawlController } from '../controllers/crawl.controller';

export function createCrawlRoutes(crawlController: CrawlController): Router {
  const router = Router();

  // POST /api/crawl - Submit a crawl request
  router.post('/', (req, res) => crawlController.submitCrawlRequest(req, res));

  return router;
}

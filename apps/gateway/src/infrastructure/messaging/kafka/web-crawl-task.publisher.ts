
import { IWebCrawlTaskPublisherPort } from '../../ports/web-crawl-task-publisher.port';
import { TraceContext } from '../../../common/types/trace-context.type';
import { Producer } from 'kafkajs';
import { TraceContextUtils } from '../../../common/utils/trace-context.utils';
import { logger } from '../../../common/utils/logger';
import { configuration } from '../../../config';
import { TaskType, WebCrawlStatus } from '../../../common/enums';

/**
 * Kafka adapter for publishing web crawl tasks
 * Implements the web crawl task publisher port using Kafka
 */
export class KafkaWebCrawlTaskPublisher implements IWebCrawlTaskPublisherPort {
  private readonly topic: string;

  constructor(private readonly producer: Producer) {
    this.topic = configuration.getConfig().kafka.topicTaskStatus;
  }

  /**
   * Publish a new web crawl task to Kafka
   */
  public async publishNewTask(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void> {
    // Create message headers with trace context
    const headers: Record<string, Buffer> = {};
    TraceContextUtils.injectIntoKafkaHeaders(traceContext, headers);

    // Add task-specific headers (matching task-manager's BaseTaskHeaderDto)
    headers['task_type'] = Buffer.from(TaskType.WEB_CRAWL);
    headers['status'] = Buffer.from(WebCrawlStatus.NEW);
    headers['timestamp'] = Buffer.from(new Date().toISOString());

    // Create message value (matching task-manager's WebCrawlNewTaskMessageDto)
    const messageValue = {
      user_email: userEmail,
      user_query: query,
      base_url: originalUrl,
    };

    // Publish message (key is null - task-manager will generate task ID)
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: null, // Task-manager will generate the task ID
          value: JSON.stringify(messageValue),
          headers,
        },
      ],
    });

    logger.info('Web crawl task published to Kafka', {
      topic: this.topic,
      userEmail,
      traceparent: traceContext.traceparent,
    });
  }
}

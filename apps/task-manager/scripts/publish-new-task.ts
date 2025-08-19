#!/usr/bin/env tsx

/**
 * Publish New Task (Kafka) — DTO header + body
 *
 * Sends a WebCrawl NEW task message to the default task-status topic using
 * the header/body contract expected by the Task Manager API.
 *
 * Usage examples:
 *   - npx nx run task-manager:build && node apps/task-manager/dist/scripts/publish-new-task.js
 *   - npm run -w @web-crawling/task-manager publish-new-task -- --email user@example.com --query "Find info" --url https://example.com
 */

import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Config and enums from the app (reuse existing configuration and types)
import { kafkaConfig, kafkaTopicConfig } from '../src/config';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import { TaskType } from '../src/common/enums/task-type.enum';

type CliArgs = {
  email: string;
  query: string;
  url: string;
  traceparent?: string;
  tracestate?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = value;
    }
  }

  return {
    email: args.email || 'user@example.com',
    query: args.query || 'Find product information',
    url: args.url || 'https://example.com',
    traceparent: args.traceparent,
    tracestate: args.tracestate,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const { email, query, url, traceparent, tracestate } = parseArgs(process.argv.slice(2));

  if (!isValidEmail(email)) throw new Error('Invalid --email');
  if (!isValidUrl(url)) throw new Error('Invalid --url');
  if (!query || !query.trim()) throw new Error('Invalid --query');

  const kafka = new Kafka({
    clientId: kafkaConfig.clientId,
    brokers: kafkaConfig.brokers,
    ssl: kafkaConfig.ssl,
    sasl: (kafkaConfig as any).sasl || undefined,
    connectionTimeout: kafkaConfig.connectionTimeout,
    requestTimeout: kafkaConfig.requestTimeout,
    retry: { initialRetryTime: kafkaConfig.retryBackoff, retries: kafkaConfig.maxRetryAttempts },
  });

  const producer = kafka.producer();
  const topic = kafkaTopicConfig.taskStatus;

  // DTO-conformant headers for NEW task (no task_id)
  // Use a single correlationId for end-to-end traceability
  const correlationId = uuidv4();
  const headers: Record<string, string> = {
    task_type: TaskType.WEB_CRAWL,
    status: TaskStatus.NEW,
    timestamp: new Date().toISOString(),
    correlation_id: correlationId,
  };
  if (traceparent) headers.traceparent = traceparent;
  if (tracestate) headers.tracestate = tracestate;

  // DTO-conformant body
  const body = {
    user_email: email,
    user_query: query,
    base_url: url,
  };

  // Vital logging for observability and debugging
  console.log('[INFO] Preparing to publish NEW task');
  console.log('[INFO] Kafka brokers:', kafkaConfig.brokers.join(','));
  console.log('[INFO] Topic:', topic);
  console.log('[INFO] Headers:', headers);
  console.log('[INFO] Body:', body);

  await producer.connect();
  try {
    const res = await producer.send({
      topic,
      messages: [
        {
          key: correlationId,
          headers,
          value: JSON.stringify(body),
        },
      ],
    });

    const r0 = res[0];
    console.log('[SUCCESS] NEW task message published', {
      topic,
      partition: r0?.partition,
      offset: r0?.offset,
      correlationId,
    });
  } finally {
    await producer.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[ERROR] Failed to publish NEW task message:', err);
    process.exit(1);
  });
}

export {};



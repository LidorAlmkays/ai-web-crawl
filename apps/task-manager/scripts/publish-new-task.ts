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
import { trace } from '@opentelemetry/api';

// Config and enums from the app (reuse existing configuration and types)
import { kafkaConfig } from '../src/config';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import { TaskType } from '../src/common/enums/task-type.enum';
import { initOpenTelemetry } from '../src/common/utils/otel-init';

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

function isValidTraceparent(traceparent?: string): boolean {
  if (!traceparent) return true; // Optional
  const traceparentRegex = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
  return traceparentRegex.test(traceparent);
}

async function main(): Promise<void> {
  const { email, query, url, traceparent, tracestate } = parseArgs(process.argv.slice(2));

  if (!isValidEmail(email)) throw new Error('Invalid --email');
  if (!isValidUrl(url)) throw new Error('Invalid --url');
  if (!query || !query.trim()) throw new Error('Invalid --query');
  if (!isValidTraceparent(traceparent)) throw new Error('Invalid --traceparent format (expected: 00-<32hex>-<16hex>-<2hex>)');

  // Initialize OpenTelemetry for this script so kafkajs auto-instrumentation creates spans
  const sdk = initOpenTelemetry();

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
  const topic = kafkaConfig.topics.taskStatus;

  // Generate a unique message ID for the Kafka key
  const messageId = uuidv4();

  // DTO-conformant headers for NEW task (no correlation_id)
  const headers: Record<string, string> = {
    task_type: TaskType.WEB_CRAWL,
    status: TaskStatus.NEW,
    timestamp: new Date().toISOString(),
    source: 'task-manager-cli',
    version: '1.0.0',
  };

  // Add W3C trace context headers if provided
  if (traceparent) {
    headers.traceparent = traceparent;
  }
  if (tracestate) {
    headers.tracestate = tracestate;
  }

  // Convert headers to Buffers as required by KafkaJS
  const kafkaHeaders: Record<string, Buffer> = {};
  for (const [key, value] of Object.entries(headers)) {
    kafkaHeaders[key] = Buffer.from(value, 'utf8');
  }

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
  console.log('[INFO] Message ID:', messageId);
  console.log('[INFO] Headers (raw):', headers);
  console.log('[INFO] Headers (JSON):', JSON.stringify(headers, null, 2));
  console.log('[INFO] Body:', body);

  await producer.connect();
  try {
    // Create a parent CLI span so producer span is a child and carries trace context
    const tracer = trace.getTracer('task-manager-cli');
    await tracer.startActiveSpan('service.request', async (span) => {
      try {
        span.setAttributes({
          'service.name': 'cli-publisher',
          'deployment.environment': 'development',
          'cli.command': 'publish-new-task',
          'messaging.destination': topic,
          'messaging.system': 'kafka',
          'messaging.message_id': messageId,
          'user.email': email,
          'web.url': url,
          'business.operation': 'publish_new_task',
          'business.entity': 'web_crawl_task',
        });

        // Manually inject trace context from active span into Kafka headers
        const ctx = span.spanContext();
        const traceparentValue = `00-${ctx.traceId}-${ctx.spanId}-01`;
        
        // Add trace context to kafka headers
        kafkaHeaders['traceparent'] = Buffer.from(traceparentValue);
        if (tracestate) {
          kafkaHeaders['tracestate'] = Buffer.from(tracestate);
        }
        
        console.log('[DEBUG] Injecting trace context into Kafka headers:', {
          traceparent: traceparentValue,
          traceId: ctx.traceId,
          spanId: ctx.spanId,
        });

        const res = await producer.send({
          topic,
          messages: [
            {
              key: messageId, // Use messageId instead of correlationId
              headers: kafkaHeaders,
              value: JSON.stringify(body),
            },
          ],
        });

        const r0 = res[0];
        
        console.log('[SUCCESS] NEW task message published successfully');
        console.log('[SUCCESS] Kafka Details:', {
          topic,
          partition: r0?.partition,
          offset: r0?.offset,
          messageId,
        });
        // Generate traceparent string for copy-paste
        const traceparent = `00-${ctx.traceId}-${ctx.spanId}-01`;
        
        console.log('[SUCCESS] Trace Details:', {
          traceId: ctx.traceId,
          spanId: ctx.spanId,
          traceparent,
        });
        console.log('[SUCCESS] Message will be processed by Task Manager with full trace context');
      } finally {
        span.end();
      }
    });
  } finally {
    await producer.disconnect();
    // Give OTEL time to flush, then shutdown SDK
    await sdk.shutdown().catch(() => {
      // Ignore shutdown errors
    });
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[ERROR] Failed to publish NEW task message:', err);
    process.exit(1);
  });
}

export {};



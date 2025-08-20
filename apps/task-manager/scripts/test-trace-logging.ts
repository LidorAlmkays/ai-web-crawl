#!/usr/bin/env tsx

/**
 * Test script to demonstrate trace context logging throughout the project
 * 
 * This script shows how trace context is included in all logs:
 * 1. HTTP request logs (with traceId and spanId)
 * 2. Kafka processing logs (with traceId and spanId)
 * 3. Business operation logs (with traceId and spanId)
 * 4. Error logs (with traceId and spanId)
 */

import { logger } from '../src/common/utils/logger';
import { trace, context } from '@opentelemetry/api';
import { generateSpanId, generateTraceId } from '../src/common/utils/tracing';
import { initOpenTelemetry } from '../src/common/utils/otel-init';

async function main() {
  console.log('🔍 Trace Context Logging Demo\n');

  // Initialize OpenTelemetry SDK
  initOpenTelemetry();
  console.log('✅ OpenTelemetry SDK initialized\n');

  // Create a tracer for this demo
  const tracer = trace.getTracer('trace-logging-demo');

  // Simulate different types of logs that would occur in the project

  // 1. HTTP Request Log (like in trace-context.middleware.ts)
  console.log('=== 1. HTTP Request Log ===');
  await tracer.startActiveSpan('http.request', async (span) => {
  span.setAttributes({
    'http.method': 'GET',
    'http.url': '/api/tasks',
    'http.target': '/api/tasks',
  });
  
  logger.info('HTTP request received', {
    method: 'GET',
    path: '/api/tasks',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0...',
  });
  
  span.end();
});

// 2. Kafka Processing Start Log (like in BaseHandler.logProcessingStart)
console.log('\n=== 2. Kafka Processing Start Log ===');
await tracer.startActiveSpan('kafka.consumer', async (span) => {
  span.setAttributes({
    'messaging.system': 'kafka',
    'messaging.operation': 'process',
    'messaging.topic': 'task-status',
  });
  
  logger.info('Starting NewTaskHandler processing', {
    processingId: 'proc_1234567890_abc123',
    topic: 'task-status',
    partition: 0,
    offset: '123',
    timestamp: '2025-08-20T11:41:51.678Z',
    traceId: 'd3d29f526ca833128679f872b3c574b2',
    spanId: '4cca08f4367b6af0',
    parentId: '115cade6fedd825b',
  });
  
  span.end();
});

// 3. Business Operation Log (like in new-task.handler.ts)
console.log('\n=== 3. Business Operation Log ===');
await tracer.startActiveSpan('business.create_task', async (span) => {
  span.setAttributes({
    'business.operation': 'create_task',
    'business.entity': 'web_crawl_task',
  });
  
  logger.info('Task abc123-def456 has been created', {
    taskId: 'abc123-def456',
    userEmail: 'test@example.com',
    status: 'new',
    processingStage: 'TASK_CREATION_SUCCESS',
    traceId: 'd3d29f526ca833128679f872b3c574b2',
    spanId: '4cca08f4367b6af0',
  });
  
  span.end();
});

// 4. Database Operation Log (like in repository adapters)
console.log('\n=== 4. Database Operation Log ===');
await tracer.startActiveSpan('db.insert', async (span) => {
  span.setAttributes({
    'db.system': 'postgresql',
    'db.operation': 'insert',
    'db.table': 'web_crawl_tasks',
  });
  
  logger.debug('Web crawl task created successfully', {
    taskId: 'abc123-def456',
    userEmail: 'test@example.com',
    status: 'new',
  });
  
  span.end();
});

// 5. Kafka Publishing Log (like in web-crawl-request.publisher.ts)
console.log('\n=== 5. Kafka Publishing Log ===');
await tracer.startActiveSpan('kafka.producer', async (span) => {
  span.setAttributes({
    'messaging.system': 'kafka',
    'messaging.operation': 'publish',
    'messaging.topic': 'requests-web-crawl',
  });
  
  logger.debug('Web crawl request published successfully', {
    taskId: 'abc123-def456',
    topic: 'requests-web-crawl',
    partition: 0,
    offset: '456',
    messageId: 'msg-789',
    duration: 25,
    userEmail: 'test@example.com',
    baseUrl: 'https://example.com',
  });
  
  span.end();
});

// 6. Error Log (like in error handling)
console.log('\n=== 6. Error Log ===');
await tracer.startActiveSpan('error.validation', async (span) => {
  span.setAttributes({
    'error.type': 'validation_error',
    'error.message': 'Invalid user email format',
  });
  
  span.recordException(new Error('Invalid user email format'));
  span.setStatus({ code: 2, message: 'Validation failed' }); // ERROR
  
  logger.error('Validation failed in NewTaskHandler', {
    processingId: 'proc_1234567890_abc123',
    topic: 'task-status',
    partition: 0,
    offset: '123',
    error: 'Invalid user email format',
  });
  
  span.end();
});

// 7. Success Log (like in logProcessingSuccess)
console.log('\n=== 7. Success Log ===');
await tracer.startActiveSpan('kafka.processing_success', async (span) => {
  span.setAttributes({
    'messaging.system': 'kafka',
    'messaging.operation': 'process_success',
  });
  
  logger.debug('Completed NewTaskHandler processing successfully', {
    processingId: 'proc_1234567890_abc123',
    topic: 'task-status',
    partition: 0,
    offset: '123',
    result: JSON.stringify({ taskId: 'abc123-def456', status: 'created' }),
  });
  
  span.end();
});

// 8. System Health Log (like in health-check.service.ts)
console.log('\n=== 8. System Health Log ===');
await tracer.startActiveSpan('health.check', async (span) => {
  span.setAttributes({
    'health.status': 'healthy',
    'health.duration': 150,
  });
  
  logger.debug('System health check completed', {
    status: 'healthy',
    duration: 150,
    checks: ['database', 'kafka', 'memory'],
  });
  
  span.end();
});

// 9. Service Startup Log (like in server.ts)
console.log('\n=== 9. Service Startup Log ===');
await tracer.startActiveSpan('service.startup', async (span) => {
  span.setAttributes({
    'service.name': 'task-manager',
    'service.version': '1.0.0',
    'service.environment': 'development',
  });
  
  logger.debug('Task Manager application started successfully', {
    port: 3000,
    environment: 'development',
    version: '1.0.0',
  });
  
  span.end();
});

// 10. Manual Trace Context Log (demonstrating manual trace context)
console.log('\n=== 10. Manual Trace Context Log ===');
const manualTraceId = generateTraceId();
const manualSpanId = generateSpanId();

await tracer.startActiveSpan('manual.trace_demo', async (span) => {
  span.setAttributes({
    'demo.operation': 'manual_trace_test',
    'demo.customTraceId': manualTraceId,
    'demo.customSpanId': manualSpanId,
  });
  
  logger.info('Manual trace context demonstration', {
    operation: 'manual_trace_test',
    customTraceId: manualTraceId,
    customSpanId: manualSpanId,
    note: 'This shows how to manually include trace context in logs',
  });
  
  span.end();
});

  console.log('\n✅ Trace Context Logging Demo Completed!');
  console.log('\n📊 Summary:');
  console.log('- All logs now include spanId from the active OpenTelemetry span');
  console.log('- Incoming requests/messages include both traceId and spanId');
  console.log('- Business operations include current trace context');
  console.log('- Error logs include trace context for debugging');
  console.log('- Console output shows: [level:X,service:Y,timestamp:Z,traceId:A,spanId:B]:message');
}

// Run the demo
main().catch(console.error);

#!/usr/bin/env tsx

/**
 * Test script to demonstrate W3C trace context extraction and span ID generation
 * 
 * This script shows how to:
 * 1. Extract trace IDs from W3C traceparent headers
 * 2. Generate new span IDs
 * 3. Parse trace context components
 * 4. Create child spans
 */

import {
  extractTraceId,
  generateSpanId,
  parseTraceparent,
  createChildTraceparent,
  createRootTraceparent,
  extractTraceContext,
  isSampled,
  isValidTraceId,
  isValidSpanId,
} from '../src/common/utils/tracing';

console.log('🔍 W3C Trace Context Extraction Demo\n');

// Example 1: Extract trace ID from a traceparent header
console.log('=== Example 1: Extract Trace ID ===');
const exampleTraceparent = '00-78199d2fc92f329fd3ecfcc51b997a02-115cade6fedd825b-01';
const traceId = extractTraceId(exampleTraceparent);
console.log(`Original traceparent: ${exampleTraceparent}`);
console.log(`Extracted trace ID:   ${traceId}`);
console.log(`Is valid trace ID:    ${isValidTraceId(traceId!)}\n`);

// Example 2: Parse complete traceparent components
console.log('=== Example 2: Parse Traceparent Components ===');
const parsed = parseTraceparent(exampleTraceparent);
if (parsed) {
  console.log('Parsed components:');
  console.log(`  Version:    ${parsed.version}`);
  console.log(`  Trace ID:   ${parsed.traceId}`);
  console.log(`  Parent ID:  ${parsed.parentId}`);
  console.log(`  Flags:      ${parsed.traceFlags} (sampled: ${isSampled(parsed.traceFlags)})`);
  console.log(`  Is valid:   ${isValidTraceId(parsed.traceId)} / ${isValidSpanId(parsed.parentId)}\n`);
}

// Example 3: Generate new span IDs
console.log('=== Example 3: Generate New Span IDs ===');
const spanId1 = generateSpanId();
const spanId2 = generateSpanId();
const spanId3 = generateSpanId();
console.log(`Generated span ID 1: ${spanId1} (length: ${spanId1.length})`);
console.log(`Generated span ID 2: ${spanId2} (length: ${spanId2.length})`);
console.log(`Generated span ID 3: ${spanId3} (length: ${spanId3.length})`);
console.log(`All unique: ${spanId1 !== spanId2 && spanId2 !== spanId3 && spanId1 !== spanId3}\n`);

// Example 4: Create child traceparent for downstream operations
console.log('=== Example 4: Create Child Spans ===');
const childTraceparent1 = createChildTraceparent(exampleTraceparent);
const childTraceparent2 = createChildTraceparent(exampleTraceparent);
console.log(`Original: ${exampleTraceparent}`);
console.log(`Child 1:  ${childTraceparent1}`);
console.log(`Child 2:  ${childTraceparent2}`);

// Verify they share the same trace ID but have different span IDs
const originalTraceId = extractTraceId(exampleTraceparent);
const child1TraceId = extractTraceId(childTraceparent1!);
const child2TraceId = extractTraceId(childTraceparent2!);
console.log(`Same trace ID: ${originalTraceId === child1TraceId && child1TraceId === child2TraceId}`);

const child1SpanId = parseTraceparent(childTraceparent1!)?.parentId;
const child2SpanId = parseTraceparent(childTraceparent2!)?.parentId;
console.log(`Different span IDs: ${child1SpanId !== child2SpanId}\n`);

// Example 5: Create root traceparent (new trace)
console.log('=== Example 5: Create Root Trace ===');
const rootTraceparent = createRootTraceparent(true);
const rootTraceId = extractTraceId(rootTraceparent);
console.log(`Root traceparent: ${rootTraceparent}`);
console.log(`Root trace ID:    ${rootTraceId}`);
console.log(`Different from original: ${rootTraceId !== originalTraceId}\n`);

// Example 6: Extract complete trace context
console.log('=== Example 6: Extract Complete Trace Context ===');
const traceContext = extractTraceContext(
  exampleTraceparent,
  'rojo=00f067aa0ba902b7,congo=t61rcWkgMzE'
);
if (traceContext) {
  console.log('Complete trace context:');
  console.log(`  Trace ID:    ${traceContext.traceId}`);
  console.log(`  Span ID:     ${traceContext.spanId}`);
  console.log(`  Parent ID:   ${traceContext.parentId}`);
  console.log(`  Flags:       ${traceContext.traceFlags}`);
  console.log(`  Traceparent: ${traceContext.traceparent}`);
  console.log(`  Tracestate:  ${traceContext.tracestate}\n`);
}

// Example 7: Simulate Kafka message processing
console.log('=== Example 7: Kafka Message Processing Simulation ===');
const kafkaHeaders = {
  'traceparent': Buffer.from(exampleTraceparent),
  'tracestate': Buffer.from('vendor1=value1,vendor2=value2'),
  'task_type': Buffer.from('web-crawl'),
  'status': Buffer.from('new'),
};

function simulateKafkaProcessing(headers: Record<string, Buffer>) {
  const traceparentBuffer = headers['traceparent'];
  
  if (traceparentBuffer) {
    const traceparent = traceparentBuffer.toString();
    const traceId = extractTraceId(traceparent);
    const newSpanId = generateSpanId();
    
    console.log(`[KAFKA] Received message with trace ID: ${traceId}`);
    console.log(`[KAFKA] Generated new span ID: ${newSpanId}`);
    
    // Create child spans for different operations
    const dbTraceparent = createChildTraceparent(traceparent);
    const httpTraceparent = createChildTraceparent(traceparent);
    
    console.log(`[DB] Child traceparent: ${dbTraceparent}`);
    console.log(`[HTTP] Child traceparent: ${httpTraceparent}`);
    
    return {
      originalTraceId: traceId,
      newSpanId,
      dbTraceparent,
      httpTraceparent,
    };
  }
  
  return null;
}

const result = simulateKafkaProcessing(kafkaHeaders);
console.log('\nProcessing result:', result);

console.log('\n✅ W3C Trace Context extraction demo completed!');

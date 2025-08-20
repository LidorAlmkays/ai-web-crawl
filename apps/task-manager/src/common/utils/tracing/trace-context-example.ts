/**
 * Example usage of W3C Trace Context utilities
 * 
 * This file demonstrates how to extract trace IDs, create span IDs,
 * and work with W3C trace context in Kafka handlers and HTTP requests.
 */

import {
  parseTraceparent,
  extractTraceId,
  generateSpanId,
  createChildTraceparent,
  createRootTraceparent,
  extractTraceContext,
  isSampled,
} from './w3c-trace-context';

// Example 1: Parse incoming traceparent from Kafka message headers
export function exampleParseKafkaHeaders() {
  const kafkaHeaders = {
    'traceparent': Buffer.from('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'),
    'tracestate': Buffer.from('rojo=00f067aa0ba902b7,congo=t61rcWkgMzE'),
  };

  const traceparentValue = kafkaHeaders.traceparent?.toString();
  
  if (traceparentValue) {
    // Extract just the trace ID
    const traceId = extractTraceId(traceparentValue);
    console.log('Trace ID:', traceId); // "4bf92f3577b34da6a3ce929d0e0e4736"

    // Parse complete traceparent
    const parsed = parseTraceparent(traceparentValue);
    console.log('Parsed traceparent:', parsed);
    // {
    //   version: "00",
    //   traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    //   parentId: "00f067aa0ba902b7",
    //   traceFlags: "01"
    // }

    // Extract complete trace context
    const traceContext = extractTraceContext(
      traceparentValue,
      kafkaHeaders.tracestate?.toString()
    );
    console.log('Trace context:', traceContext);
  }
}

// Example 2: Create child span for downstream service calls
export function exampleCreateChildSpan() {
  const incomingTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  
  // Create a child traceparent for a downstream service call
  const childTraceparent = createChildTraceparent(incomingTraceparent);
  console.log('Child traceparent:', childTraceparent);
  // "00-4bf92f3577b34da6a3ce929d0e0e4736-<new-span-id>-01"
  
  // The trace ID stays the same, but we get a new span ID
  const originalTraceId = extractTraceId(incomingTraceparent);
  const childTraceId = extractTraceId(childTraceparent!);
  console.log('Same trace ID?', originalTraceId === childTraceId); // true
}

// Example 3: Start a new root trace
export function exampleCreateRootTrace() {
  // Create a completely new trace (for starting a new request)
  const rootTraceparent = createRootTraceparent(true); // sampled=true
  console.log('Root traceparent:', rootTraceparent);
  // "00-<new-trace-id>-<new-span-id>-01"
  
  const traceId = extractTraceId(rootTraceparent);
  console.log('New trace ID:', traceId);
}

// Example 4: Check sampling status
export function exampleCheckSampling() {
  const sampledTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const unsampledTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00';
  
  const parsed1 = parseTraceparent(sampledTraceparent);
  const parsed2 = parseTraceparent(unsampledTraceparent);
  
  console.log('Is sampled?', isSampled(parsed1!.traceFlags)); // true
  console.log('Is sampled?', isSampled(parsed2!.traceFlags)); // false
}

// Example 5: Generate span IDs for manual instrumentation
export function exampleManualInstrumentation() {
  const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
  
  // Generate new span IDs for different operations
  const dbSpanId = generateSpanId();
  const httpSpanId = generateSpanId();
  const processingSpanId = generateSpanId();
  
  console.log('Database operation span ID:', dbSpanId);
  console.log('HTTP call span ID:', httpSpanId);
  console.log('Processing span ID:', processingSpanId);
  
  // Create traceparent headers for each operation
  const dbTraceparent = `00-${traceId}-${dbSpanId}-01`;
  const httpTraceparent = `00-${traceId}-${httpSpanId}-01`;
  const processingTraceparent = `00-${traceId}-${processingSpanId}-01`;
  
  console.log('DB traceparent:', dbTraceparent);
  console.log('HTTP traceparent:', httpTraceparent);
  console.log('Processing traceparent:', processingTraceparent);
}

// Example 6: Practical Kafka handler usage
export function exampleKafkaHandlerUsage(kafkaMessage: any) {
  const headers = kafkaMessage.headers || {};
  const traceparentBuffer = headers['traceparent'];
  
  if (traceparentBuffer) {
    const traceparent = traceparentBuffer.toString();
    const traceId = extractTraceId(traceparent);
    
    console.log(`[KAFKA] Processing message with trace ID: ${traceId}`);
    
    // Create child span for database operations
    const dbTraceparent = createChildTraceparent(traceparent);
    console.log(`[DB] Using traceparent: ${dbTraceparent}`);
    
    // Create child span for HTTP calls
    const httpTraceparent = createChildTraceparent(traceparent);
    console.log(`[HTTP] Using traceparent: ${httpTraceparent}`);
    
    return {
      traceId,
      dbTraceparent,
      httpTraceparent,
    };
  } else {
    // No trace context, start a new trace
    const rootTraceparent = createRootTraceparent();
    const traceId = extractTraceId(rootTraceparent);
    
    console.log(`[KAFKA] Starting new trace with ID: ${traceId}`);
    
    return {
      traceId,
      rootTraceparent,
    };
  }
}

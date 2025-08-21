import { randomBytes } from 'crypto';

/**
 * W3C Trace Context utilities for parsing and generating trace context data
 * 
 * Based on W3C Trace Context specification:
 * https://www.w3.org/TR/trace-context/#trace-context-http-headers-format
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentId?: string;
  traceFlags: string;
  traceparent: string;
}

export interface ParsedTraceparent {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
}

/**
 * Parse a W3C traceparent header into its components
 * 
 * @param traceparent - The traceparent header value (e.g., "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
 * @returns Parsed components or null if invalid
 */
export function parseTraceparent(traceparent: string): ParsedTraceparent | null {
  if (!traceparent || typeof traceparent !== 'string') {
    return null;
  }

  // W3C format: 00-<32hex>-<16hex>-<2hex>
  const regex = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
  const match = traceparent.match(regex);

  if (!match) {
    return null;
  }

  const [, version, traceId, parentId, traceFlags] = match;

  // Currently only version "00" is supported
  if (version !== '00') {
    return null;
  }

  // Trace ID cannot be all zeros
  if (traceId === '00000000000000000000000000000000') {
    return null;
  }

  // Parent ID cannot be all zeros
  if (parentId === '0000000000000000') {
    return null;
  }

  return {
    version,
    traceId,
    parentId,
    traceFlags,
  };
}

/**
 * Extract trace ID from a W3C traceparent header
 * 
 * @param traceparent - The traceparent header value
 * @returns The trace ID (32 hex characters) or null if invalid
 */
export function extractTraceId(traceparent: string): string | null {
  const parsed = parseTraceparent(traceparent);
  return parsed ? parsed.traceId : null;
}

/**
 * Generate a new span ID (16 hex characters / 8 bytes)
 * 
 * @returns A new random span ID
 */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Generate a new trace ID (32 hex characters / 16 bytes)
 * 
 * @returns A new random trace ID
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new traceparent header with a new span ID but same trace ID
 * 
 * @param traceparent - The original traceparent header
 * @param isSampled - Whether the trace should be sampled (default: true)
 * @returns New traceparent header with new span ID, or null if original is invalid
 */
export function createChildTraceparent(traceparent: string, isSampled: boolean = true): string | null {
  const parsed = parseTraceparent(traceparent);
  if (!parsed) {
    return null;
  }

  const newSpanId = generateSpanId();
  const traceFlags = isSampled ? '01' : '00';

  return `00-${parsed.traceId}-${newSpanId}-${traceFlags}`;
}

/**
 * Create a new root traceparent header (starts a new trace)
 * 
 * @param isSampled - Whether the trace should be sampled (default: true)
 * @returns New root traceparent header
 */
export function createRootTraceparent(isSampled: boolean = true): string {
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const traceFlags = isSampled ? '01' : '00';

  return `00-${traceId}-${spanId}-${traceFlags}`;
}

/**
 * Extract complete trace context from traceparent and optionally tracestate
 * 
 * @param traceparent - The traceparent header value
 * @param tracestate - Optional tracestate header value
 * @returns Complete trace context or null if traceparent is invalid
 */
export function extractTraceContext(traceparent: string, tracestate?: string): TraceContext | null {
  const parsed = parseTraceparent(traceparent);
  if (!parsed) {
    return null;
  }

  return {
    traceId: parsed.traceId,
    spanId: parsed.parentId, // The parent becomes our span
    parentId: undefined, // We don't know the grandparent
    traceFlags: parsed.traceFlags,
    traceparent,
  };
}

/**
 * Check if a trace is sampled based on trace flags
 * 
 * @param traceFlags - The trace flags (2 hex characters)
 * @returns True if sampled, false otherwise
 */
export function isSampled(traceFlags: string): boolean {
  if (!traceFlags || traceFlags.length !== 2) {
    return false;
  }

  const flags = parseInt(traceFlags, 16);
  return (flags & 0x01) === 0x01; // Check if least significant bit is set
}

/**
 * Validate a trace ID format
 * 
 * @param traceId - The trace ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidTraceId(traceId: string): boolean {
  if (!traceId || traceId.length !== 32) {
    return false;
  }

  // Must be hex and not all zeros
  return /^[0-9a-f]{32}$/.test(traceId) && traceId !== '00000000000000000000000000000000';
}

/**
 * Validate a span ID format
 * 
 * @param spanId - The span ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidSpanId(spanId: string): boolean {
  if (!spanId || spanId.length !== 16) {
    return false;
  }

  // Must be hex and not all zeros
  return /^[0-9a-f]{16}$/.test(spanId) && spanId !== '0000000000000000';
}

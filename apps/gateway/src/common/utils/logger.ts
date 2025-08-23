import { trace } from '@opentelemetry/api';
import * as os from 'os';

// Gateway-specific configuration - using environment variables to avoid circular dependency
const svcName = 'gateway';
const isProd = process.env.NODE_ENV === 'production';
const environment = process.env.NODE_ENV || 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

function shouldLog(level: LogLevel) {
  // In production: hide debug
  if (isProd && level === 'debug') return false;
  return true;
}

// No SDK wiring to keep logger simple and avoid build issues

// Temporarily disabled OTLP log sending to reduce noise
// TODO: Re-enable with proper OTLP log exporter when needed

function buildServiceInfo(level: LogLevel) {
  const span = trace.getActiveSpan();
  const ctx = span?.spanContext();
  const s: any = {
    level,
    service: svcName,
    timestamp: new Date().toISOString(),
    environment,
    host: os.hostname(),
  };
  if (ctx?.traceId && ctx.traceId !== '00000000000000000000000000000000') s.traceId = ctx.traceId;
  if (ctx?.spanId && ctx.spanId !== '0000000000000000') s.spanId = ctx.spanId;
  return s;
}

function mapSeverity(level: LogLevel): { severityText: string; severityNumber: number } {
  switch (level === 'success' ? 'info' : level) {
    case 'error': return { severityText: 'ERROR', severityNumber: 17 };
    case 'warn': return { severityText: 'WARN', severityNumber: 13 };
    case 'debug': return { severityText: 'DEBUG', severityNumber: 7 };
    default: return { severityText: 'INFO', severityNumber: 9 };
  }
}

// Temporarily disabled OTLP functions
// TODO: Re-enable with proper OTLP log exporter when needed

function log(level: LogLevel, message: string, info?: Record<string, any>) {
  if (!shouldLog(level)) return;
  const serviceInfo = buildServiceInfo(level);
  const logInfo = info && typeof info === 'object' ? info : {};

  // Prepare OpenTelemetry Log Data Model JSON for console
  const nowIso = new Date().toISOString();
  const { severityText, severityNumber } = mapSeverity(level);
  const otelConsoleJson: any = {
    timestamp: nowIso,
    observedTimestamp: nowIso,
    severityText,
    severityNumber,
    body: message,
    resource: {
      'service.name': svcName,
      'host.name': serviceInfo.host,
      'deployment.environment': environment,
    },
    attributes: {
      ...logInfo,
    },
  };
  if (serviceInfo.traceId) otelConsoleJson.traceId = serviceInfo.traceId;
  if (serviceInfo.spanId) otelConsoleJson.spanId = serviceInfo.spanId;
  if (serviceInfo.traceId) otelConsoleJson.flags = 1;

  const line = JSON.stringify(otelConsoleJson, null, 2);
  if (level === 'error') process.stderr.write(line + '\n\n'); else process.stdout.write(line + '\n\n');

  // Temporarily disable manual OTLP log sending to reduce noise
  // The OpenTelemetry SDK will handle trace context automatically
  // TODO: Re-enable with proper OTLP log exporter when needed
}

export const logger = {
  debug: (m: string, i?: Record<string, any>) => log('debug', m, i),
  info:  (m: string, i?: Record<string, any>) => log('info', m, i),
  warn:  (m: string, i?: Record<string, any>) => log('warn', m, i),
  error: (m: string, i?: Record<string, any>) => log('error', m, i),
  success: (m: string, i?: Record<string, any>) => log('success', m, i),
  child: (additionalContext: Record<string, any>) => ({
    debug: (m: string, i?: Record<string, any>) => log('debug', m, { ...additionalContext, ...i }),
    info:  (m: string, i?: Record<string, any>) => log('info', m, { ...additionalContext, ...i }),
    warn:  (m: string, i?: Record<string, any>) => log('warn', m, { ...additionalContext, ...i }),
    error: (m: string, i?: Record<string, any>) => log('error', m, { ...additionalContext, ...i }),
    success: (m: string, i?: Record<string, any>) => log('success', m, { ...additionalContext, ...i }),
    child: (additionalContext2: Record<string, any>) => logger.child({ ...additionalContext, ...additionalContext2 }),
  }),
};

// Emit a shutdown log to OTEL when the process stops
let shutdownHandled = false;
async function handleShutdown(signal: string) {
  if (shutdownHandled) return;
  shutdownHandled = true;
  try {
    logger.info('Gateway service stopping', { signal });
  } finally {
    // Do not force exit here; let the app decide
  }
}

process.once('SIGINT', () => { void handleShutdown('SIGINT'); });
process.once('SIGTERM', () => { void handleShutdown('SIGTERM'); });
process.once('beforeExit', () => { void handleShutdown('beforeExit'); });

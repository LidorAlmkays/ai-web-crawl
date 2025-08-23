import { trace } from '@opentelemetry/api';
import { request } from 'http';
import { URL } from 'url';
import * as os from 'os';

// Gateway-specific configuration - using environment variables to avoid circular dependency
const svcName = 'gateway';
const isProd = process.env.NODE_ENV === 'production';
const logsEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otelLogsEnabled = process.env.TRACING_ENABLED !== 'false';
const environment = process.env.NODE_ENV || 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

function shouldLog(level: LogLevel) {
  // In production: hide debug
  if (isProd && level === 'debug') return false;
  return true;
}

// No SDK wiring to keep logger simple and avoid build issues

async function sendToOtel(body: any): Promise<void> {
  if (!otelLogsEnabled) return;
  
  try {
    const url = new URL(`${logsEndpoint.replace(/\/$/, '')}/v1/logs`);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    return new Promise<void>((resolve) => {
      const req = request(options, (res) => {
        // Consume and discard response to free socket
        res.resume();
        res.on('end', () => resolve());
      });
      
      req.on('error', () => resolve()); // Silent failure
      req.on('timeout', () => {
        req.destroy();
        resolve();
      });
      
      req.setTimeout(3000);
      req.write(postData);
      req.end();
    });
  } catch {
    // Silent failure
  }
}

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

function hexToBase64(hex: string): string {
  try {
    return Buffer.from(hex, 'hex').toString('base64');
  } catch {
    return '';
  }
}

function toOtlpAttributes(obj: Record<string, any>): any[] {
  return Object.entries(obj || {}).map(([key, value]) => ({
    key,
    value: { stringValue: typeof value === 'string' ? value : JSON.stringify(value) },
  }));
}

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

  // Proper OTLP/HTTP JSON payload for /v1/logs
  try {
    const span = trace.getActiveSpan();
    const ctx = span?.spanContext();
    const traceIdB64 = ctx?.traceId ? hexToBase64(ctx.traceId) : undefined;
    const spanIdB64 = ctx?.spanId ? hexToBase64(ctx.spanId) : undefined;
    const nowNs = (BigInt(Date.now()) * 1000000n).toString();

    const otlpPayload = {
      resourceLogs: [
        {
          resource: {
            attributes: toOtlpAttributes({
              'service.name': svcName,
              'host.name': serviceInfo.host,
              'deployment.environment': environment,
            }),
          },
          scopeLogs: [
            {
              scope: { name: 'app-logger' },
              logRecords: [
                {
                  timeUnixNano: nowNs,
                  observedTimeUnixNano: nowNs,
                  severityNumber,
                  severityText,
                  body: { stringValue: message },
                  attributes: toOtlpAttributes(logInfo),
                  ...(traceIdB64 ? { traceId: traceIdB64 } : {}),
                  ...(spanIdB64 ? { spanId: spanIdB64 } : {}),
                  flags: serviceInfo.traceId ? 1 : 0,
                },
              ],
            },
          ],
        },
      ],
    };

    void sendToOtel(otlpPayload);
  } catch {
    // ignore
  }
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

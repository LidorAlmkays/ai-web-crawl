import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { observabilityConfig } from '../../config/observability';
import { SpanDebugger } from './tracing/span-debug';

// Set environment variables for OTEL configuration
process.env.OTEL_NODE_RESOURCE_DETECTORS = 'none';
process.env.OTEL_TRACES_SAMPLER = 'always_on';
process.env.OTEL_TRACES_SAMPLER_ARG = '1.0';

/**
 * Initialize OpenTelemetry with enhanced tracing support
 *
 * This function sets up the OpenTelemetry SDK with:
 * - Trace exporter to OTEL collector
 * - Batch span processor for performance
 * - Resource attributes for service identification
 * - Auto-instrumentation for common libraries
 * - Graceful shutdown handling
 * - Development span debugging (non-production only)
 */
export const initOpenTelemetry = () => {
  // Use consolidated observability config
  const config = observabilityConfig;

  // Set up diagnostics
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: config.traces.endpoint,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure resource attributes
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: config.service.name,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.service.version,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.service.environment,
  });

  // Configure span processor with batching for performance
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: config.traces.batch.maxQueueSize,
    maxExportBatchSize: config.traces.batch.maxExportBatchSize,
    scheduledDelayMillis: config.traces.batch.scheduledDelayMillis,
    exportTimeoutMillis: config.traces.batch.exportTimeoutMillis,
  });

  // Create SDK with enhanced configuration
  const sdk = new NodeSDK({
    resource,
    spanProcessors: [spanProcessor],
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable core auto-instrumentations (no custom hooks to satisfy typings)
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-kafkajs': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
      }),
    ],
  });

  // Start the SDK
  sdk.start();
  diag.info('OpenTelemetry SDK started with auto-instrumentation enabled', {
    serviceName: config.service.name,
    environment: config.service.environment,
    samplingRate: config.traces.samplingRate,
    exportEndpoint: config.traces.endpoint,
    autoInstrumentations: ['express', 'kafkajs', 'pg'],
  });

  // Enable span debugging in development environment
  if (config.service.environment !== 'production') {
    SpanDebugger.enable();
    diag.info('Span debugging enabled for development environment');
  }

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    diag.info('Received SIGTERM, shutting down OpenTelemetry SDK...');
    sdk
      .shutdown()
      .then(() => diag.info('OpenTelemetry SDK has been shutdown successfully'))
      .catch((error) =>
        diag.error('Error shutting down OpenTelemetry SDK', error)
      )
      .finally(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    diag.info('Received SIGINT, shutting down OpenTelemetry SDK...');
    sdk
      .shutdown()
      .then(() => diag.info('OpenTelemetry SDK has been shutdown successfully'))
      .catch((error) =>
        diag.error('Error shutting down OpenTelemetry SDK', error)
      )
      .finally(() => process.exit(0));
  });

  return sdk;
};

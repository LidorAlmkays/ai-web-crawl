import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getTracingConfig, validateTracingConfig } from '../../config/tracing';
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
  // Get and validate tracing configuration
  const config = getTracingConfig();
  const validation = validateTracingConfig(config);

  if (!validation.isValid) {
    diag.error('Invalid tracing configuration:', validation.errors);
    throw new Error(
      `Invalid tracing configuration: ${validation.errors.join(', ')}`
    );
  }

  // Set up diagnostics
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: config.exportEndpoint,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure resource attributes
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]:
      config.attributes['service.version'],
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    ...config.attributes,
  });

  // Configure span processor with batching for performance
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: config.batchProcessor.maxQueueSize,
    maxExportBatchSize: config.batchProcessor.maxExportBatchSize,
    scheduledDelayMillis: config.batchProcessor.scheduledDelayMillis,
    exportTimeoutMillis: config.batchProcessor.exportTimeoutMillis,
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
    serviceName: config.serviceName,
    environment: config.environment,
    samplingRate: config.samplingRate,
    exportEndpoint: config.exportEndpoint,
    autoInstrumentations: ['express', 'kafkajs', 'pg'],
  });

  // Enable span debugging in development environment
  if (process.env.NODE_ENV !== 'production') {
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

import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { configuration } from '../../config';
import { logger } from './logger';

// Set environment variables for OTEL configuration
process.env.OTEL_NODE_RESOURCE_DETECTORS = 'none';
process.env.OTEL_TRACES_SAMPLER = 'always_on';
process.env.OTEL_TRACES_SAMPLER_ARG = '1.0';

let isInitialized = false;
let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry for the gateway service
 */
export function initializeOpenTelemetry(): void {
  try {
    if (isInitialized) {
      logger.info('OpenTelemetry already initialized');
      return;
    }

    const config = configuration.getConfig();
    
    if (!config.observability.tracing.enabled) {
      logger.info('OpenTelemetry tracing is disabled');
      return;
    }

    // Set up diagnostics
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    // Create resource with service information
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    });

    // Create trace exporter with proper endpoint
    const traceExporter = new OTLPTraceExporter({
      url: `${config.observability.tracing.exporterEndpoint}/v1/traces`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Configure span processor with batching for performance
    const spanProcessor = new BatchSpanProcessor(traceExporter, {
      maxQueueSize: config.observability.tracing.batch.maxQueueSize,
      maxExportBatchSize: config.observability.tracing.batch.maxExportBatchSize,
      scheduledDelayMillis: config.observability.tracing.batch.scheduledDelayMillis,
      exportTimeoutMillis: config.observability.tracing.batch.exportTimeoutMillis,
    });

    // Initialize the SDK with proper configuration
    sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-kafkajs': { enabled: true },
          // Disable other instrumentations
          '@opentelemetry/instrumentation-redis': { enabled: false },
          '@opentelemetry/instrumentation-mysql': { enabled: false },
          '@opentelemetry/instrumentation-mongodb': { enabled: false },
          '@opentelemetry/instrumentation-pg': { enabled: false },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    diag.info('OpenTelemetry SDK started with auto-instrumentation enabled', {
      serviceName: config.serviceName,
      environment: config.environment,
      samplingRate: config.observability.tracing.samplingRate,
      exportEndpoint: `${config.observability.tracing.exporterEndpoint}/v1/traces`,
      autoInstrumentations: ['express', 'http', 'kafkajs'],
    });

    logger.info('OpenTelemetry initialized successfully', {
      serviceName: config.serviceName,
      exporterEndpoint: `${config.observability.tracing.exporterEndpoint}/v1/traces`,
    });

    isInitialized = true;

  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error });
    // Don't throw - allow service to continue without tracing
  }
}

/**
 * Check if OpenTelemetry is initialized
 */
export function isOpenTelemetryInitialized(): boolean {
  return isInitialized;
}

/**
 * Get current tracer
 */
export function getTracer(name: string = 'gateway-service') {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name);
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    logger.info('OpenTelemetry SDK shut down');
    isInitialized = false;
  }
}

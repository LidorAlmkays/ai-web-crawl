export interface BaseConfig {
  environment: string;
  serviceName: string;
  serviceVersion: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  topicTaskStatus: string;
  retry: {
    initialRetryTime: number;
    retries: number;
  };
  ssl: {
    enabled: boolean;
    ca?: string[];
    key?: string;
    cert?: string;
  };
}

export interface ObservabilityConfig {
  tracing: {
    enabled: boolean;
    samplingRate: number;
    exporterEndpoint: string;
    batch: {
      maxQueueSize: number;
      maxExportBatchSize: number;
      scheduledDelayMillis: number;
      exportTimeoutMillis: number;
    };
  };
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
  };
  logging: {
    level: string;
    format: 'json' | 'text';
    includeTimestamp: boolean;
  };
}

export interface HealthCheckConfig {
  enabled: boolean;
  port: number;
  path: string;
  timeout: number;
}

export interface GatewayConfig extends BaseConfig {
  server: ServerConfig;
  kafka: KafkaConfig;
  observability: ObservabilityConfig;
  healthCheck: HealthCheckConfig;
}

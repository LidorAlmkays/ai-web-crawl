import { config as dotenvConfig } from 'dotenv';
import { envSchema, type EnvConfig } from './env.schema';
import { GatewayConfig } from './types';
import { logger } from '../common/utils/logger';

// Load environment variables
dotenvConfig();

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: GatewayConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public getConfig(): GatewayConfig {
    return this.config;
  }

  private loadConfiguration(): GatewayConfig {
    try {
      // Validate environment variables
      const env = envSchema.parse(process.env);
      
      const config: GatewayConfig = {
        environment: env.NODE_ENV,
        serviceName: env.APP_NAME,
        serviceVersion: env.APP_VERSION,
        isDevelopment: env.NODE_ENV === 'development',
        isProduction: env.NODE_ENV === 'production',
        isTest: env.NODE_ENV === 'test',
        
        server: this.createServerConfig(env),
        kafka: this.createKafkaConfig(env),
        observability: this.createObservabilityConfig(env),
        healthCheck: this.createHealthCheckConfig(env),
      };

      logger.info('Configuration loaded successfully', {
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.environment,
      });

      return config;
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private createServerConfig(env: EnvConfig) {
    return {
      port: env.APP_PORT,
      host: '0.0.0.0',
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      },
    };
  }

  private createKafkaConfig(env: EnvConfig) {
    return {
      brokers: env.KAFKA_BROKERS,
      clientId: env.KAFKA_CLIENT_ID,
      topicTaskStatus: env.KAFKA_TOPIC_TASK_STATUS,
      retry: {
        initialRetryTime: env.KAFKA_RETRY_INITIAL_TIME,
        retries: env.KAFKA_RETRY_RETRIES,
      },
      ssl: {
        enabled: false,
      },
    };
  }

  private createObservabilityConfig(env: EnvConfig) {
    return {
      tracing: {
        enabled: env.TRACING_ENABLED,
        samplingRate: env.TRACING_SAMPLING_RATE,
        exporterEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        batch: {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        },
      },
      metrics: {
        enabled: env.METRICS_ENABLED,
        port: env.METRICS_PORT,
        path: '/metrics',
      },
      logging: {
        level: env.LOG_LEVEL,
        format: env.LOG_FORMAT,
        includeTimestamp: env.LOG_INCLUDE_TIMESTAMP,
      },
    };
  }

  private createHealthCheckConfig(env: EnvConfig) {
    return {
      enabled: env.HEALTH_CHECK_ENABLED,
      port: env.HEALTH_CHECK_PORT,
      path: env.HEALTH_CHECK_PATH,
      timeout: 5000,
    };
  }
}

// Export singleton instance
export const configuration = ConfigurationManager.getInstance();
export const config = configuration.getConfig();

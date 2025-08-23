# Job 2: Configuration Management

## Objective
Set up comprehensive configuration management with environment variable validation, type-safe configuration objects, and proper error handling for the gateway service.

## Prerequisites
- Job 1 completed (project structure and utilities copied)
- Environment variables defined in PRD
- Configuration patterns from task-manager service

## Inputs
- Environment variables specification from PRD
- Configuration patterns from `apps/task-manager/src/config/`
- Directory structure from Job 1

## Detailed Implementation Steps

### Step 1: Create Configuration Interfaces

#### 1.1 Base Configuration Interface
Create `apps/gateway/src/config/types.ts`:

```typescript
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
```

#### 1.2 Environment Variable Schema
Create `apps/gateway/src/config/env.schema.ts`:

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('gateway'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3002'),
  
  // Health check
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default('true'),
  HEALTH_CHECK_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3003'),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  
  // Kafka
  KAFKA_BROKERS: z.string().transform(val => val.split(',')).default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('gateway-service'),
  KAFKA_TOPIC_TASK_STATUS: z.string().default('task-status'),
  KAFKA_RETRY_INITIAL_TIME: z.string().transform(Number).default('1000'),
  KAFKA_RETRY_RETRIES: z.string().transform(Number).default('3'),
  
  // OpenTelemetry
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),
  TRACING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  TRACING_SAMPLING_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('1.0'),
  
  // Metrics
  METRICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('9465'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_INCLUDE_TIMESTAMP: z.string().transform(val => val === 'true').default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;
```

### Step 2: Create Configuration Files

#### 2.1 Main Configuration File
Create `apps/gateway/src/config/index.ts`:

```typescript
import { config } from 'dotenv';
import { envSchema, type EnvConfig } from './env.schema';
import { ServerConfig } from './server';
import { KafkaConfig } from './kafka';
import { ObservabilityConfig } from './observability';
import { HealthCheckConfig } from './health-check';
import { GatewayConfig } from './types';
import { logger } from '../common/utils/logger';

// Load environment variables
config();

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

  private createServerConfig(env: EnvConfig): ServerConfig {
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

  private createKafkaConfig(env: EnvConfig): KafkaConfig {
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

  private createObservabilityConfig(env: EnvConfig): ObservabilityConfig {
    return {
      tracing: {
        enabled: env.TRACING_ENABLED,
        samplingRate: env.TRACING_SAMPLING_RATE,
        exporterEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
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

  private createHealthCheckConfig(env: EnvConfig): HealthCheckConfig {
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
```

#### 2.2 Server Configuration
Create `apps/gateway/src/config/server.ts`:

```typescript
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

export const createServerConfig = (port: number): ServerConfig => ({
  port,
  host: '0.0.0.0',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
});
```

#### 2.3 Kafka Configuration
Create `apps/gateway/src/config/kafka.ts`:

```typescript
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

export const createKafkaConfig = (
  brokers: string[],
  clientId: string,
  topicTaskStatus: string
): KafkaConfig => ({
  brokers,
  clientId,
  topicTaskStatus,
  retry: {
    initialRetryTime: 1000,
    retries: 3,
  },
  ssl: {
    enabled: false,
  },
});
```

#### 2.4 Observability Configuration
Create `apps/gateway/src/config/observability.ts`:

```typescript
export interface ObservabilityConfig {
  tracing: {
    enabled: boolean;
    samplingRate: number;
    exporterEndpoint: string;
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

export const createObservabilityConfig = (
  tracingEnabled: boolean,
  samplingRate: number,
  exporterEndpoint: string,
  metricsEnabled: boolean,
  metricsPort: number,
  logLevel: string,
  logFormat: 'json' | 'text',
  includeTimestamp: boolean
): ObservabilityConfig => ({
  tracing: {
    enabled: tracingEnabled,
    samplingRate,
    exporterEndpoint,
  },
  metrics: {
    enabled: metricsEnabled,
    port: metricsPort,
    path: '/metrics',
  },
  logging: {
    level: logLevel,
    format: logFormat,
    includeTimestamp,
  },
});
```

#### 2.5 Health Check Configuration
Create `apps/gateway/src/config/health-check.ts`:

```typescript
export interface HealthCheckConfig {
  enabled: boolean;
  port: number;
  path: string;
  timeout: number;
}

export const createHealthCheckConfig = (
  enabled: boolean,
  port: number,
  path: string
): HealthCheckConfig => ({
  enabled,
  port,
  path,
  timeout: 5000,
});
```

### Step 3: Create Environment File Template

Create `apps/gateway/.env.example`:

```bash
# Application
NODE_ENV=development
APP_NAME=gateway
APP_VERSION=1.0.0
APP_PORT=3002

# Health check configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=3003
HEALTH_CHECK_PATH=/health

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=gateway-service
KAFKA_TOPIC_TASK_STATUS=task-status
KAFKA_RETRY_INITIAL_TIME=1000
KAFKA_RETRY_RETRIES=3

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=1.0

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9465

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_INCLUDE_TIMESTAMP=true
```

### Step 4: Create Configuration Validation

Create `apps/gateway/src/config/validation.ts`:

```typescript
import { GatewayConfig } from './types';
import { logger } from '../common/utils/logger';

export class ConfigurationValidator {
  public static validate(config: GatewayConfig): void {
    this.validateServerConfig(config.server);
    this.validateKafkaConfig(config.kafka);
    this.validateObservabilityConfig(config.observability);
    this.validateHealthCheckConfig(config.healthCheck);
    
    logger.info('Configuration validation completed successfully');
  }

  private static validateServerConfig(server: any): void {
    if (!server.port || server.port < 1 || server.port > 65535) {
      throw new Error('Invalid server port configuration');
    }
    
    if (!server.host) {
      throw new Error('Server host is required');
    }
  }

  private static validateKafkaConfig(kafka: any): void {
    if (!kafka.brokers || kafka.brokers.length === 0) {
      throw new Error('Kafka brokers are required');
    }
    
    if (!kafka.clientId) {
      throw new Error('Kafka client ID is required');
    }
    
    if (!kafka.topicTaskStatus) {
      throw new Error('Kafka task status topic is required');
    }
  }

  private static validateObservabilityConfig(observability: any): void {
    if (observability.tracing.enabled) {
      if (!observability.tracing.exporterEndpoint) {
        throw new Error('Tracing exporter endpoint is required when tracing is enabled');
      }
      
      if (observability.tracing.samplingRate < 0 || observability.tracing.samplingRate > 1) {
        throw new Error('Tracing sampling rate must be between 0 and 1');
      }
    }
    
    if (observability.metrics.enabled) {
      if (!observability.metrics.port || observability.metrics.port < 1 || observability.metrics.port > 65535) {
        throw new Error('Invalid metrics port configuration');
      }
    }
  }

  private static validateHealthCheckConfig(healthCheck: any): void {
    if (healthCheck.enabled) {
      if (!healthCheck.port || healthCheck.port < 1 || healthCheck.port > 65535) {
        throw new Error('Invalid health check port configuration');
      }
      
      if (!healthCheck.path) {
        throw new Error('Health check path is required');
      }
    }
  }
}
```

## Outputs

### Files Created
- `apps/gateway/src/config/types.ts` - Configuration interfaces
- `apps/gateway/src/config/env.schema.ts` - Environment variable schema
- `apps/gateway/src/config/index.ts` - Main configuration manager
- `apps/gateway/src/config/server.ts` - Server configuration
- `apps/gateway/src/config/kafka.ts` - Kafka configuration
- `apps/gateway/src/config/observability.ts` - Observability configuration
- `apps/gateway/src/config/health-check.ts` - Health check configuration
- `apps/gateway/src/config/validation.ts` - Configuration validation
- `apps/gateway/.env.example` - Environment file template

### Files Modified
- `apps/gateway/package.json` - Add zod dependency if not present

## Detailed Testing Criteria

### 1. Configuration Loading
- [ ] **Environment Variable Loading**:
  - [ ] All required environment variables are loaded
  - [ ] Default values are applied when variables are missing
  - [ ] Invalid environment variables throw appropriate errors
  - [ ] Environment variable validation works correctly

- [ ] **Configuration Object Creation**:
  - [ ] Configuration object is created successfully
  - [ ] All configuration sections are properly populated
  - [ ] Type safety is maintained throughout
  - [ ] No undefined or null values in critical fields

### 2. Configuration Validation
- [ ] **Server Configuration**:
  - [ ] Port validation (1-65535 range)
  - [ ] Host validation (non-empty string)
  - [ ] CORS configuration validation
  - [ ] Rate limiting configuration validation

- [ ] **Kafka Configuration**:
  - [ ] Brokers array validation (non-empty)
  - [ ] Client ID validation (non-empty string)
  - [ ] Topic validation (non-empty string)
  - [ ] Retry configuration validation

- [ ] **Observability Configuration**:
  - [ ] Tracing configuration validation
  - [ ] Metrics configuration validation
  - [ ] Logging configuration validation
  - [ ] Sampling rate validation (0-1 range)

- [ ] **Health Check Configuration**:
  - [ ] Port validation (1-65535 range)
  - [ ] Path validation (non-empty string)
  - [ ] Timeout validation (positive number)

### 3. Error Handling
- [ ] **Missing Environment Variables**:
  - [ ] Graceful handling of missing optional variables
  - [ ] Clear error messages for missing required variables
  - [ ] Default values are applied correctly

- [ ] **Invalid Values**:
  - [ ] Invalid port numbers throw appropriate errors
  - [ ] Invalid URLs throw appropriate errors
  - [ ] Invalid boolean values throw appropriate errors
  - [ ] Invalid enum values throw appropriate errors

- [ ] **Configuration Validation**:
  - [ ] Validation errors are descriptive and actionable
  - [ ] Validation stops on first error or continues with all errors
  - [ ] Error messages include the problematic field name

### 4. Type Safety
- [ ] **TypeScript Compilation**:
  - [ ] All configuration files compile without errors
  - [ ] Type definitions are accurate and complete
  - [ ] No `any` types are used inappropriately
  - [ ] Generic types are used where appropriate

- [ ] **Runtime Type Safety**:
  - [ ] Configuration objects match their interfaces
  - [ ] No type coercion issues
  - [ ] Enum values are properly validated

### 5. Performance Testing
- [ ] **Configuration Loading Performance**:
  - [ ] Configuration loads in < 100ms
  - [ ] No memory leaks during configuration loading
  - [ ] Singleton pattern works correctly
  - [ ] Multiple calls to getInstance() return same instance

### 6. Integration Testing
- [ ] **Logger Integration**:
  - [ ] Configuration loading logs are generated
  - [ ] Error logging works correctly
  - [ ] Log levels are respected

- [ ] **Environment Integration**:
  - [ ] Works in development environment
  - [ ] Works in production environment
  - [ ] Works in test environment
  - [ ] Environment-specific configurations are applied

### 7. Documentation Testing
- [ ] **Environment File**:
  - [ ] .env.example contains all required variables
  - [ ] Default values are documented
  - [ ] Variable descriptions are clear
  - [ ] No sensitive information is exposed

## Performance Requirements
- [ ] Configuration loading completes in < 100ms
- [ ] Configuration validation completes in < 50ms
- [ ] Memory usage remains constant after initial load
- [ ] No blocking operations during configuration loading

## Error Handling Requirements
- [ ] Clear error messages for all validation failures
- [ ] Graceful degradation when optional features are disabled
- [ ] Proper error propagation to calling code
- [ ] Logging of all configuration errors

## Security Requirements
- [ ] No sensitive information in configuration logs
- [ ] Environment variables are properly sanitized
- [ ] SSL configuration is properly validated
- [ ] CORS configuration is secure by default

## Documentation Requirements
- [ ] All configuration options are documented
- [ ] Environment variable descriptions are clear
- [ ] Example configurations are provided
- [ ] Troubleshooting guide is included

## Rollback Plan
If this job fails:
1. Remove all created configuration files
2. Restore original environment handling
3. Document what failed and why
4. Create issue for investigation

## Success Criteria
- [ ] All configuration files are created and working
- [ ] Environment variable validation works correctly
- [ ] Type-safe configuration objects are created
- [ ] Default values are applied correctly
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] No TypeScript compilation errors

## Estimated Time
**Total**: 1-2 hours
- Configuration interfaces: 30 minutes
- Configuration files: 45 minutes
- Validation logic: 30 minutes
- Testing and documentation: 15 minutes

## Dependencies for Next Job
This job must be completed before:
- Job 3: OpenTelemetry Setup (needs configuration)
- Job 7: Infrastructure - Kafka Publisher (needs Kafka config)
- All subsequent jobs (need configuration)

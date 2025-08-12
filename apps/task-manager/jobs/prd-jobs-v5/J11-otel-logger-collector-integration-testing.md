# Job 11: OTEL Logger and Collector Integration Testing

## Objective

Test and verify that the OTEL logger properly sends logs to the OTEL collector, and that the collector successfully forwards logs to Loki. Ensure end-to-end log flow works correctly.

## Status: 🔄 IN PROGRESS

## Current State Analysis

### Issues to Verify

- ❌ OTEL logger configuration not tested with real collector
- ❌ Log forwarding to Loki not verified
- ❌ Collector configuration not validated
- ❌ End-to-end log flow not tested
- ❌ Error handling in log forwarding not tested

## Requirements

### 1. OTEL Logger Testing

- **✅ Verify OTEL logger configuration**: Ensure proper endpoint and format
- **✅ Test log sending**: Verify logs are sent to collector
- **✅ Test error handling**: Verify graceful handling of collector failures
- **✅ Test service name inclusion**: Verify service name is included in logs

### 2. OTEL Collector Testing

- **✅ Verify collector startup**: Ensure collector starts with configuration
- **✅ Test log reception**: Verify collector receives logs from Task Manager
- **✅ Test log forwarding**: Verify logs are forwarded to Loki
- **✅ Test configuration validation**: Ensure configuration is valid

### 3. Loki Integration Testing

- **✅ Verify Loki startup**: Ensure Loki starts and is accessible
- **✅ Test log ingestion**: Verify Loki receives logs from collector
- **✅ Test log querying**: Verify logs can be queried in Loki
- **✅ Test log retention**: Verify log retention policies work

### 4. End-to-End Testing

- **✅ Complete log flow**: Task Manager → OTEL Logger → Collector → Loki
- **✅ Log format verification**: Ensure log format is preserved
- **✅ Metadata preservation**: Verify correlation IDs and other metadata
- **✅ Performance testing**: Ensure no performance degradation

## Implementation Plan

### Phase 1: OTEL Logger Configuration Verification

**Test the current OTEL logger implementation:**

```typescript
// Current implementation in otel-logger.ts
private createOtelExporter(): OTLPLogExporter {
  const otelEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  return new OTLPLogExporter({
    url: `${otelEndpoint}/v1/logs`,
    headers: {},
    keepAlive: true,
    timeoutMillis: 30000,
  });
}
```

**Test Cases:**

1. ✅ Verify endpoint configuration
2. ✅ Test connection to collector
3. ✅ Verify log format and structure
4. ✅ Test error handling for connection failures

### Phase 2: OTEL Collector Configuration Testing

**Test the collector configuration:**

```yaml
# deployment/observability/configs/otel-collector.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  loki:
    endpoint: 'http://loki:3100/loki/api/v1/push'
    format: 'json'
    labels:
      resource:
        service.name: 'service_name'
        service.namespace: 'service_namespace'
      attributes:
        severity: 'severity'
        level: 'level'

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki, logging]
```

**Test Cases:**

1. ✅ Verify collector starts with configuration
2. ✅ Test log reception on HTTP endpoint (4318)
3. ✅ Test log reception on gRPC endpoint (4317)
4. ✅ Verify log forwarding to Loki
5. ✅ Test batch processing configuration

### Phase 3: Loki Integration Testing

**Test Loki configuration and log ingestion:**

```yaml
# deployment/observability/configs/loki.yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s
```

**Test Cases:**

1. ✅ Verify Loki starts successfully
2. ✅ Test log ingestion from collector
3. ✅ Verify log storage and retrieval
4. ✅ Test log querying via Loki API
5. ✅ Verify log retention policies

### Phase 4: End-to-End Integration Testing

**Test complete log flow:**

1. **Start Task Manager with OTEL logger:**

   ```bash
   LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start
   ```

2. **Start observability stack:**

   ```bash
   cd deployment/observability
   docker-compose up -d
   ```

3. **Generate test logs:**

   - Start Task Manager
   - Send test Kafka messages
   - Trigger various log levels (INFO, ERROR, DEBUG)

4. **Verify log flow:**
   - Check collector logs for received messages
   - Check Loki for ingested logs
   - Query logs in Loki to verify content

## Testing Scripts

### 1. OTEL Logger Test Script

**File**: `apps/task-manager/scripts/test-otel-logger.js`

```javascript
const { logger } = require('../src/common/utils/loggers');

async function testOtelLogger() {
  console.log('Testing OTEL Logger...');

  // Test different log levels
  logger.info('Test info message from OTEL logger');
  logger.error('Test error message from OTEL logger');
  logger.debug('Test debug message from OTEL logger');
  logger.warn('Test warning message from OTEL logger');

  // Test with metadata
  logger.info('Test message with metadata', {
    correlationId: 'test-123',
    taskId: 'task-456',
    userEmail: 'test@example.com',
  });

  console.log('OTEL Logger test completed');
}

testOtelLogger().catch(console.error);
```

### 2. Collector Health Check Script

**File**: `apps/task-manager/scripts/test-collector-health.js`

```javascript
const axios = require('axios');

async function testCollectorHealth() {
  try {
    // Test collector metrics endpoint
    const metricsResponse = await axios.get('http://localhost:8888/metrics');
    console.log('✅ Collector metrics endpoint accessible');

    // Test collector health endpoint
    const healthResponse = await axios.get('http://localhost:8888/');
    console.log('✅ Collector health endpoint accessible');

    return true;
  } catch (error) {
    console.error('❌ Collector health check failed:', error.message);
    return false;
  }
}

testCollectorHealth();
```

### 3. Loki Query Test Script

**File**: `apps/task-manager/scripts/test-loki-query.js`

```javascript
const axios = require('axios');

async function testLokiQuery() {
  try {
    // Query recent logs
    const query = '{service_name="task-manager"}';
    const response = await axios.get(`http://localhost:3100/loki/api/v1/query_range`, {
      params: {
        query,
        start: Date.now() - 300000, // 5 minutes ago
        end: Date.now(),
        step: '1s',
      },
    });

    console.log('✅ Loki query successful');
    console.log('Logs found:', response.data.data.result.length);

    return response.data.data.result;
  } catch (error) {
    console.error('❌ Loki query failed:', error.message);
    return [];
  }
}

testLokiQuery();
```

## Test Execution Plan

### Step 1: Infrastructure Setup

```bash
# Create deployment directory structure
mkdir -p deployment/observability/{configs,data/{loki,prometheus,grafana}}

# Start observability stack
cd deployment/observability
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Step 2: OTEL Logger Testing

```bash
# Test OTEL logger configuration
cd apps/task-manager
LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 node scripts/test-otel-logger.js
```

### Step 3: Collector Testing

```bash
# Test collector health
node scripts/test-collector-health.js

# Check collector logs
docker logs otel-collector
```

### Step 4: Loki Testing

```bash
# Test Loki query
node scripts/test-loki-query.js

# Check Loki logs
docker logs loki
```

### Step 5: End-to-End Testing

```bash
# Start Task Manager with OTEL logger
LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start

# In another terminal, send test messages
# Then query Loki for logs
```

## Expected Results

### 1. OTEL Logger Results

- ✅ Logs are sent to collector endpoint
- ✅ Service name is included in logs
- ✅ Log levels are preserved
- ✅ Metadata is included
- ✅ Error handling works for connection failures

### 2. Collector Results

- ✅ Collector starts successfully
- ✅ Logs are received from Task Manager
- ✅ Logs are forwarded to Loki
- ✅ Batch processing works
- ✅ Metrics endpoint is accessible

### 3. Loki Results

- ✅ Loki starts successfully
- ✅ Logs are ingested from collector
- ✅ Logs can be queried
- ✅ Log format is preserved
- ✅ Metadata is accessible

### 4. End-to-End Results

- ✅ Complete log flow works
- ✅ No log loss in the pipeline
- ✅ Performance is acceptable
- ✅ Error handling works at all levels

## Success Criteria

1. **✅ OTEL Logger Works**: Successfully sends logs to collector
2. **✅ Collector Works**: Receives and forwards logs to Loki
3. **✅ Loki Works**: Ingests and stores logs properly
4. **✅ End-to-End Flow**: Complete log pipeline works
5. **✅ Error Handling**: Graceful handling of failures
6. **✅ Performance**: No significant performance impact
7. **✅ Monitoring**: Log flow is observable and debuggable

## Estimated Time

**🔄 IN PROGRESS** - OTEL logger and collector integration testing (0.5 days)




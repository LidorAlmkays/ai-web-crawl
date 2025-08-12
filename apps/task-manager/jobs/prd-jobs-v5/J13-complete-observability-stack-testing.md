# Job 13: Complete Observability Stack Testing

## Objective

Test and verify the complete observability stack including OTEL Collector, Loki, Prometheus, Jaeger, and unified Grafana monitoring. Ensure all components work together seamlessly and provide comprehensive observability for the Task Manager application.

## Status: 🔄 IN PROGRESS

## Current State Analysis

### Issues to Verify

- ❌ Complete observability stack not tested end-to-end
- ❌ Jaeger trace collection and visualization not verified
- ❌ Unified Grafana monitoring not tested
- ❌ Cross-correlation between logs, metrics, and traces not verified
- ❌ Auto-provisioning of Grafana data sources and dashboards not tested

## Requirements

### 1. Complete Stack Testing

- **✅ Verify all services start successfully**: OTEL Collector, Loki, Prometheus, Jaeger, Grafana
- **✅ Test service dependencies**: Ensure proper startup order and connectivity
- **✅ Verify data flow**: Task Manager → OTEL Collector → Backends → Grafana
- **✅ Test unified monitoring**: All data accessible through Grafana

### 2. Jaeger Integration Testing

- **✅ Verify trace collection**: Ensure traces are sent to Jaeger
- **✅ Test trace visualization**: Verify traces are displayed in Jaeger UI
- **✅ Test trace search**: Verify trace search and filtering works
- **✅ Test service mapping**: Verify service dependencies are mapped

### 3. Unified Grafana Testing

- **✅ Verify auto-provisioning**: Data sources and dashboards auto-configured
- **✅ Test data source connectivity**: Prometheus, Loki, and Jaeger data sources work
- **✅ Test dashboard functionality**: Pre-configured dashboards display data correctly
- **✅ Test cross-correlation**: Navigate between metrics, logs, and traces

### 4. End-to-End Observability Testing

- **✅ Complete data flow**: Logs, metrics, and traces flow through entire pipeline
- **✅ Data consistency**: Data is consistent across all backends
- **✅ Performance impact**: Minimal performance impact on Task Manager
- **✅ Error handling**: Graceful handling of service failures

## Implementation Plan

### Phase 1: Infrastructure Testing

**Test the complete observability stack:**

```bash
# Start the complete stack
cd deployment/observability
docker-compose up -d

# Verify all services are running
docker-compose ps

# Check service logs for errors
docker-compose logs otel-collector
docker-compose logs loki
docker-compose logs prometheus
docker-compose logs jaeger
docker-compose logs grafana
```

**Test Cases:**

1. ✅ All services start successfully
2. ✅ No startup errors in logs
3. ✅ Services are accessible on configured ports
4. ✅ Network connectivity between services works
5. ✅ Volume mounts work correctly

### Phase 2: OTEL Collector Integration Testing

**Test OTEL Collector with all backends:**

```bash
# Test OTEL logger with complete stack
cd apps/task-manager
LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start
```

**Test Cases:**

1. ✅ Collector receives logs, metrics, and traces from Task Manager
2. ✅ Logs are forwarded to Loki successfully
3. ✅ Metrics are forwarded to Prometheus successfully
4. ✅ Traces are forwarded to Jaeger successfully
5. ✅ No data loss in the pipeline

### Phase 3: Backend Testing

**Test each backend individually:**

1. **Loki Testing:**

   ```bash
   # Test Loki log ingestion
   curl "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"task-manager\"}"
   ```

2. **Prometheus Testing:**

   ```bash
   # Test Prometheus metrics collection
   curl "http://localhost:9090/api/v1/query?query=task_manager_tasks_created_total"
   ```

3. **Jaeger Testing:**
   ```bash
   # Test Jaeger trace collection
   curl "http://localhost:16686/api/services"
   curl "http://localhost:16686/api/traces?service=task-manager&limit=10"
   ```

**Test Cases:**

1. ✅ Loki accepts and stores logs
2. ✅ Prometheus scrapes and stores metrics
3. ✅ Jaeger accepts and stores traces
4. ✅ Data is queryable from each backend
5. ✅ Data retention policies work

### Phase 4: Grafana Integration Testing

**Test unified Grafana monitoring:**

```bash
# Test Grafana health and data sources
curl "http://localhost:3001/api/health"
curl "http://localhost:3001/api/datasources"
curl "http://localhost:3001/api/search"
```

**Test Cases:**

1. ✅ Grafana starts successfully
2. ✅ All data sources are auto-provisioned
3. ✅ Data sources are accessible and working
4. ✅ Dashboards are auto-provisioned
5. ✅ Dashboard panels display data correctly

### Phase 5: Cross-Correlation Testing

**Test unified monitoring experience:**

1. **Metrics to Logs:**

   - View task creation metrics in Grafana
   - Click on metric to drill down to related logs
   - Verify log correlation works

2. **Logs to Traces:**

   - View recent logs in Grafana
   - Click on log entry to view related traces
   - Verify trace correlation works

3. **Traces to Metrics:**
   - View traces in Grafana
   - Navigate to related metrics
   - Verify metric correlation works

**Test Cases:**

1. ✅ Cross-correlation between data types works
2. ✅ Navigation between different data types is seamless
3. ✅ Context is preserved during navigation
4. ✅ Performance is acceptable

## Testing Scripts

### 1. Complete Stack Health Check

**File**: `apps/task-manager/scripts/test-complete-stack.js`

```javascript
const axios = require('axios');

async function testCompleteStack() {
  const services = [
    { name: 'OTEL Collector', url: 'http://localhost:8888/metrics' },
    { name: 'Loki', url: 'http://localhost:3100/ready' },
    { name: 'Prometheus', url: 'http://localhost:9090/-/healthy' },
    { name: 'Jaeger', url: 'http://localhost:16686/api/services' },
    { name: 'Grafana', url: 'http://localhost:3001/api/health' },
  ];

  console.log('Testing complete observability stack...\n');

  for (const service of services) {
    try {
      await axios.get(service.url);
      console.log(`✅ ${service.name} is healthy`);
    } catch (error) {
      console.log(`❌ ${service.name} is not healthy: ${error.message}`);
    }
  }
}

testCompleteStack();
```

### 2. Data Flow Testing

**File**: `apps/task-manager/scripts/test-data-flow.js`

```javascript
const axios = require('axios');

async function testDataFlow() {
  console.log('Testing data flow through observability stack...\n');

  try {
    // Test Loki logs
    const lokiResponse = await axios.get('http://localhost:3100/loki/api/v1/query_range', {
      params: {
        query: '{service_name="task-manager"}',
        start: Date.now() - 300000, // 5 minutes ago
        end: Date.now(),
        step: '1s',
      },
    });
    console.log(`✅ Loki logs: ${lokiResponse.data.data.result.length} log streams`);

    // Test Prometheus metrics
    const prometheusResponse = await axios.get('http://localhost:9090/api/v1/query', {
      params: { query: 'task_manager_tasks_created_total' },
    });
    console.log(`✅ Prometheus metrics: ${prometheusResponse.data.data.result.length} metrics`);

    // Test Jaeger traces
    const jaegerResponse = await axios.get('http://localhost:16686/api/traces', {
      params: { service: 'task-manager', limit: 10 },
    });
    console.log(`✅ Jaeger traces: ${jaegerResponse.data.data.length} traces`);

    return true;
  } catch (error) {
    console.error('❌ Data flow test failed:', error.message);
    return false;
  }
}

testDataFlow();
```

### 3. Grafana Integration Testing

**File**: `apps/task-manager/scripts/test-grafana-integration.js`

```javascript
const axios = require('axios');

async function testGrafanaIntegration() {
  try {
    // Test Grafana health
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Grafana health check passed');

    // Test data sources
    const datasourcesResponse = await axios.get('http://localhost:3001/api/datasources');
    console.log('✅ Grafana data sources accessible');
    console.log('Data sources found:', datasourcesResponse.data.length);

    for (const ds of datasourcesResponse.data) {
      console.log(`- ${ds.name} (${ds.type}): ${ds.url}`);
    }

    // Test dashboards
    const dashboardsResponse = await axios.get('http://localhost:3001/api/search');
    console.log('✅ Grafana dashboards accessible');
    console.log('Dashboards found:', dashboardsResponse.data.length);

    for (const dashboard of dashboardsResponse.data) {
      console.log(`- ${dashboard.title} (${dashboard.type})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Grafana integration test failed:', error.message);
    return false;
  }
}

testGrafanaIntegration();
```

### 4. Cross-Correlation Testing

**File**: `apps/task-manager/scripts/test-cross-correlation.js`

```javascript
const axios = require('axios');

async function testCrossCorrelation() {
  console.log('Testing cross-correlation between observability data...\n');

  try {
    // Test metrics to logs correlation
    const metricsResponse = await axios.get('http://localhost:9090/api/v1/query', {
      params: { query: 'task_manager_tasks_created_total' },
    });

    if (metricsResponse.data.data.result.length > 0) {
      const taskCount = metricsResponse.data.data.result[0].value[1];
      console.log(`✅ Found ${taskCount} tasks created`);

      // Check for related logs
      const logsResponse = await axios.get('http://localhost:3100/loki/api/v1/query_range', {
        params: {
          query: '{service_name="task-manager"} |= "task created"',
          start: Date.now() - 300000,
          end: Date.now(),
          step: '1s',
        },
      });
      console.log(`✅ Found ${logsResponse.data.data.result.length} related log streams`);
    }

    // Test logs to traces correlation
    const logsResponse = await axios.get('http://localhost:3100/loki/api/v1/query_range', {
      params: {
        query: '{service_name="task-manager"}',
        start: Date.now() - 300000,
        end: Date.now(),
        step: '1s',
      },
    });

    if (logsResponse.data.data.result.length > 0) {
      console.log(`✅ Found ${logsResponse.data.data.result.length} log streams`);

      // Check for related traces
      const tracesResponse = await axios.get('http://localhost:16686/api/traces', {
        params: { service: 'task-manager', limit: 10 },
      });
      console.log(`✅ Found ${tracesResponse.data.data.length} related traces`);
    }

    return true;
  } catch (error) {
    console.error('❌ Cross-correlation test failed:', error.message);
    return false;
  }
}

testCrossCorrelation();
```

## Test Execution Plan

### Step 1: Start Complete Stack

```bash
# Start observability stack
cd deployment/observability
docker-compose up -d

# Wait for services to start
sleep 30

# Verify all services are running
docker-compose ps
```

### Step 2: Test Infrastructure

```bash
# Test complete stack health
cd apps/task-manager
node scripts/test-complete-stack.js
```

### Step 3: Start Task Manager

```bash
# Start Task Manager with OTEL logger
LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start
```

### Step 4: Test Data Flow

```bash
# Test data flow through all backends
node scripts/test-data-flow.js
```

### Step 5: Test Grafana Integration

```bash
# Test Grafana data sources and dashboards
node scripts/test-grafana-integration.js
```

### Step 6: Test Cross-Correlation

```bash
# Test cross-correlation between data types
node scripts/test-cross-correlation.js
```

### Step 7: Manual Testing

1. **Access Grafana**: http://localhost:3001 (admin/admin)
2. **Verify dashboards**: Check Task Manager Overview dashboard
3. **Test data sources**: Verify Prometheus, Loki, and Jaeger data sources
4. **Test cross-correlation**: Navigate between metrics, logs, and traces
5. **Access Jaeger**: http://localhost:16686
6. **Verify traces**: Search for task-manager traces

## Expected Results

### 1. Infrastructure Results

- ✅ All services start successfully
- ✅ No startup errors or warnings
- ✅ Services are accessible on configured ports
- ✅ Network connectivity works between all services
- ✅ Volume mounts work correctly

### 2. Data Flow Results

- ✅ OTEL Collector receives data from Task Manager
- ✅ Logs flow to Loki successfully
- ✅ Metrics flow to Prometheus successfully
- ✅ Traces flow to Jaeger successfully
- ✅ No data loss in the pipeline

### 3. Backend Results

- ✅ Loki stores and serves logs correctly
- ✅ Prometheus scrapes and stores metrics correctly
- ✅ Jaeger stores and serves traces correctly
- ✅ All backends are queryable and responsive

### 4. Grafana Results

- ✅ Grafana starts with all data sources auto-provisioned
- ✅ Prometheus data source works correctly
- ✅ Loki data source works correctly
- ✅ Jaeger data source works correctly
- ✅ Dashboards are auto-provisioned and functional
- ✅ Cross-correlation between data types works

### 5. Unified Monitoring Results

- ✅ Single pane of glass for all observability data
- ✅ Seamless navigation between metrics, logs, and traces
- ✅ Context preservation during navigation
- ✅ Performance is acceptable
- ✅ Error handling works gracefully

## Success Criteria

1. **✅ Complete Stack**: All observability services start and work together
2. **✅ Data Flow**: Logs, metrics, and traces flow through entire pipeline
3. **✅ Backend Storage**: All data is properly stored and queryable
4. **✅ Unified Monitoring**: Grafana provides unified access to all data
5. **✅ Cross-Correlation**: Seamless navigation between different data types
6. **✅ Performance**: Minimal performance impact on Task Manager
7. **✅ Reliability**: Graceful handling of service failures
8. **✅ Usability**: Intuitive and comprehensive monitoring experience

## Estimated Time

**🔄 IN PROGRESS** - Complete observability stack testing (1 day)




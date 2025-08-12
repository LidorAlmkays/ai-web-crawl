# Observability Stack

This directory contains the complete observability infrastructure for the Task Manager application, including log aggregation, metrics collection, distributed tracing, and unified monitoring through Grafana. The OTEL Collector serves as the central hub that collects all data from Task Manager and forwards it to appropriate backends.

## Architecture Overview

```
Task Manager
    ↓ (OTLP - logs, metrics, traces)
OTEL Collector (Central Hub)
    ↓
├── Logs → Loki
├── Metrics → Prometheus (via scraping)
└── Traces → Jaeger
    ↓
All data accessible through Grafana
```

## Components

### 1. OTEL Collector (Central Hub)

- **Purpose**: Central hub that collects logs, metrics, and traces from Task Manager and forwards them to appropriate backends
- **Ports**:
  - 4317 (gRPC) - Receives OTLP data from Task Manager
  - 4318 (HTTP) - Receives OTLP data from Task Manager
  - 9464 (HTTP) - Exposes Prometheus metrics for scraping
- **Configuration**: `configs/otel-collector.yaml`
- **Key Features**:
  - Single point of data collection
  - No external scraping of Task Manager
  - Backend-independent data forwarding
  - Resource attribution and processing

### 2. Loki

- **Purpose**: Log aggregation and storage (receives logs from OTEL Collector)
- **Port**: 3100
- **Configuration**: `configs/loki.yaml`
- **Data**: `data/loki/`

### 3. Prometheus

- **Purpose**: Metrics collection and storage (scrapes metrics from OTEL Collector)
- **Port**: 9090
- **Configuration**: `configs/prometheus.yml`
- **Data**: `data/prometheus/`
- **Key Feature**: Scrapes from OTEL Collector, not directly from Task Manager

### 4. Jaeger

- **Purpose**: Distributed tracing and trace visualization (receives traces from OTEL Collector)
- **Ports**:
  - 16686 (UI)
  - 14268 (HTTP collector)
  - 14250 (gRPC collector)
- **Data**: `data/jaeger/`

### 5. Grafana

- **Purpose**: Unified visualization and dashboards for all observability data
- **Port**: 3001 (mapped from 3000)
- **Default Credentials**: admin/admin
- **Data**: `data/grafana/`
- **Features**:
  - Metrics visualization (Prometheus)
  - Log exploration (Loki)
  - Trace visualization (Jaeger)
  - Unified dashboards

## Key Benefits

1. **Centralized Data Collection**: OTEL Collector is the single point of data collection
2. **Backend Independence**: Can easily switch between different backends (Loki, Prometheus, Jaeger)
3. **No External Dependencies**: Task Manager doesn't need to expose metrics endpoints
4. **Unified Configuration**: All data flow configuration in one place
5. **Scalability**: Easy to add more services or backends
6. **Security**: Reduced attack surface (no direct external access to Task Manager)

## Quick Start

### 1. Start the Observability Stack

```bash
cd deployment/observability
docker-compose up -d
```

### 2. Verify Services

```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs otel-collector
docker-compose logs loki
docker-compose logs prometheus
docker-compose logs jaeger
docker-compose logs grafana
```

### 3. Access Services

- **Grafana (Unified Dashboard)**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100
- **Jaeger**: http://localhost:16686

## Configuration

### Task Manager Configuration

To use the OTEL logger with this stack, set these environment variables:

```bash
LOG_FORMAT=otel
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Data Flow Configuration

All data flow is configured in the OTEL Collector:

1. **Logs**: Task Manager → OTEL Collector → Loki
2. **Metrics**: Task Manager → OTEL Collector → Prometheus (scraped)
3. **Traces**: Task Manager → OTEL Collector → Jaeger

### Grafana Data Sources

All data sources are automatically provisioned:

1. **Prometheus**:

   - URL: `http://prometheus:9090`
   - Purpose: Metrics visualization (via OTEL Collector)

2. **Loki**:

   - URL: `http://loki:3100`
   - Purpose: Log exploration (via OTEL Collector)

3. **Jaeger**:
   - URL: `http://jaeger:16686`
   - Purpose: Trace visualization (via OTEL Collector)

### Pre-configured Dashboards

- **Task Manager Overview**: Unified dashboard with metrics, logs, and traces
- **Task Processing Metrics**: Real-time task creation, completion, and error rates
- **Log Analysis**: Recent logs with filtering capabilities
- **Trace Analysis**: Distributed tracing for request flows

## Testing

### Test OTEL Logger Integration

```bash
# From the task-manager directory
LOG_FORMAT=otel OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start
```

### Test OTEL Collector Metrics Endpoint

```bash
# Test the Prometheus metrics endpoint exposed by OTEL Collector
curl http://localhost:9464/metrics
```

### Test Prometheus Queries

```bash
# Query task creation metrics (scraped from OTEL Collector)
curl "http://localhost:9090/api/v1/query?query=task_manager_tasks_created_total"

# Query 24-hour task creation rate
curl "http://localhost:9090/api/v1/query?query=increase(task_manager_tasks_created_total[24h])"
```

### Test Loki Queries

```bash
# Query recent logs (forwarded by OTEL Collector)
curl "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"task-manager\"}&start=$(date -d '5 minutes ago' +%s)000000000&end=$(date +%s)000000000&step=1s"
```

### Test Jaeger Traces

```bash
# Jaeger UI is available at http://localhost:16686
# You can search for traces by service name, operation, or tags
```

## Unified Monitoring with Grafana

### Dashboard Features

1. **Metrics Panels**:

   - Task creation/completion rates
   - Error rates and trends
   - Processing latency
   - System health metrics

2. **Log Panels**:

   - Recent application logs
   - Error log filtering
   - Log correlation with traces

3. **Trace Panels**:
   - Request flow visualization
   - Performance bottlenecks
   - Service dependencies

### Cross-Correlation

- Click on metrics to drill down to related logs
- Click on logs to view related traces
- Navigate between different data types seamlessly

## Troubleshooting

### Common Issues

1. **OTEL Collector not receiving data**:

   - Check Task Manager environment variables
   - Verify collector is running: `docker logs otel-collector`
   - Check network connectivity

2. **Prometheus not scraping metrics**:

   - Verify OTEL Collector is running and exposing metrics on port 9464
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify OTEL Collector metrics endpoint: http://localhost:9464/metrics

3. **Loki not receiving logs**:

   - Check OTEL Collector logs
   - Verify Loki is running: `docker logs loki`
   - Check Loki configuration

4. **Jaeger not receiving traces**:

   - Check OTEL Collector logs
   - Verify Jaeger is running: `docker logs jaeger`
   - Check Jaeger configuration

5. **Grafana data sources not working**:
   - Check data source URLs in provisioning
   - Verify all services are running
   - Check Grafana logs: `docker logs grafana`

### Log Locations

- **OTEL Collector**: `docker logs otel-collector`
- **Loki**: `docker logs loki`
- **Prometheus**: `docker logs prometheus`
- **Jaeger**: `docker logs jaeger`
- **Grafana**: `docker logs grafana`

## Data Persistence

All data is persisted in the `data/` directory:

- `data/loki/` - Loki log storage
- `data/prometheus/` - Prometheus metrics storage
- `data/jaeger/` - Jaeger trace storage
- `data/grafana/` - Grafana dashboards and configuration

## Scaling

For production deployments, consider:

1. **Loki**: Use external storage (S3, GCS) instead of filesystem
2. **Prometheus**: Use remote storage (Thanos, Cortex)
3. **Jaeger**: Use external storage (Elasticsearch, Cassandra)
4. **OTEL Collector**: Deploy multiple instances behind a load balancer
5. **Grafana**: Use external database for configuration persistence

## Security

For production deployments:

1. Enable authentication in Loki, Prometheus, and Jaeger
2. Configure all services with TLS
3. Use secrets for sensitive configuration
4. Restrict network access to observability ports
5. Use reverse proxy for external access
6. Implement role-based access control in Grafana

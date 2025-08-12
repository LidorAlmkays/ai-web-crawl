# Job 10: Observability Infrastructure Reorganization

## Objective

Reorganize all observability components into a proper deployment structure with Docker Compose files for OTEL Collector, Loki, Prometheus, Jaeger, and unified Grafana monitoring. The OTEL Collector serves as the central hub that collects all data (logs, metrics, traces) from Task Manager and forwards them to appropriate backends.

## Status: 🔄 IN PROGRESS

## Current State Analysis

### Issues to Resolve

- ❌ Observability components scattered throughout workspace
- ❌ No centralized deployment structure
- ❌ Missing Docker Compose configuration for observability stack
- ❌ OTEL Collector configuration not properly organized
- ❌ Loki, Prometheus, and Jaeger configurations missing
- ❌ No unified monitoring through Grafana
- ❌ External services scraping Task Manager instead of using OTEL Collector
- ❌ No clear separation between application and observability infrastructure

## Requirements

### 1. Deployment Structure

- **✅ Create `deployment/` directory** at workspace root
- **✅ Create `deployment/observability/` subdirectory**
- **✅ Move all observability configurations** to the new structure
- **✅ Create Docker Compose files** for each observability component

### 2. Observability Stack Components

- **✅ OTEL Collector**: Central hub that collects logs, metrics, and traces from Task Manager and forwards them to backends
- **✅ Loki**: Log aggregation and storage (receives logs from OTEL Collector)
- **✅ Prometheus**: Metrics collection and storage (receives metrics from OTEL Collector)
- **✅ Jaeger**: Distributed tracing and trace visualization (receives traces from OTEL Collector)
- **✅ Grafana**: Unified visualization and dashboards for all observability data

### 3. Configuration Files

- **✅ OTEL Collector config**: YAML configuration for log, metrics, and trace processing and forwarding
- **✅ Loki config**: Log aggregation configuration
- **✅ Prometheus config**: Metrics collection configuration (scrapes from OTEL Collector)
- **✅ Jaeger config**: Distributed tracing configuration (receives from OTEL Collector)
- **✅ Grafana config**: Unified dashboard configuration with auto-provisioning
- **✅ Docker Compose**: Orchestration of all services

## Implementation Plan

### Phase 1: Directory Structure Creation

```
deployment/
├── docker-compose.yml              # Main application compose
└── observability/
    ├── docker-compose.yml          # Observability stack compose
    ├── configs/
    │   ├── otel-collector.yaml     # OTEL Collector configuration
    │   ├── loki.yaml              # Loki configuration
    │   ├── prometheus.yml         # Prometheus configuration
    │   └── grafana/               # Grafana configuration
    │       ├── provisioning/
    │       │   ├── datasources/
    │       │   │   └── datasources.yml
    │       │   └── dashboards/
    │       │       ├── dashboards.yml
    │       │       └── json/
    │       │           └── task-manager-overview.json
    ├── data/                      # Persistent data volumes
    │   ├── loki/
    │   ├── prometheus/
    │   ├── jaeger/
    │   └── grafana/
    └── README.md                  # Deployment documentation
```

### Phase 2: OTEL Collector Configuration (Central Hub)

**File**: `deployment/observability/configs/otel-collector.yaml`

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 1500
  resource:
    attributes:
      - key: service.name
        value: 'task-manager'
        action: upsert

exporters:
  logging:
    loglevel: debug
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
  prometheus:
    endpoint: '0.0.0.0:9464'
    namespace: 'task_manager'
    const_labels:
      label1: value1
    send_timestamps: true
    metric_expiration: 180m
    enable_open_metrics: true
  jaeger:
    endpoint: 'http://jaeger:14268/api/traces'
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [loki, logging]
    metrics:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [prometheus, logging]
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [jaeger, logging]
```

### Phase 3: Loki Configuration

**File**: `deployment/observability/configs/loki.yaml`

```yaml
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

schema_config:
  configs:
    - from: 2020-05-15
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /tmp/loki/boltdb-shipper-active
    cache_location: /tmp/loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /tmp/loki/chunks

compactor:
  working_directory: /tmp/loki/boltdb-shipper-compactor
  shared_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

### Phase 4: Prometheus Configuration (Scrapes from OTEL Collector)

**File**: `deployment/observability/configs/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:9464']
    metrics_path: '/metrics'
    scrape_interval: 5s
    scrape_timeout: 3s
```

### Phase 5: Docker Compose Configuration

**File**: `deployment/observability/docker-compose.yml`

```yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    container_name: otel-collector
    command: ['--config=/etc/otel-collector-config.yaml']
    volumes:
      - ./configs/otel-collector.yaml:/etc/otel-collector-config.yaml
    ports:
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
      - '9464:9464' # Prometheus metrics endpoint
    networks:
      - observability
    depends_on:
      - loki
      - jaeger

  loki:
    image: grafana/loki:latest
    container_name: loki
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./configs/loki.yaml:/etc/loki/local-config.yaml
      - ./data/loki:/tmp/loki
    networks:
      - observability

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - '9090:9090'
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./configs/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./data/prometheus:/prometheus
    networks:
      - observability

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - '16686:16686' # Jaeger UI
      - '14268:14268' # HTTP collector
      - '14250:14250' # gRPC collector
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - COLLECTOR_OTLP_HTTP_PORT=4318
      - COLLECTOR_OTLP_GRPC_PORT=4317
    networks:
      - observability

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-jaeger-datasource
    volumes:
      - ./data/grafana:/var/lib/grafana
      - ./configs/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - observability
    depends_on:
      - loki
      - prometheus
      - jaeger

networks:
  observability:
    driver: bridge

volumes:
  loki-data:
  prometheus-data:
  grafana-data:
  jaeger-data:
```

### Phase 6: Grafana Configuration

**File**: `deployment/observability/configs/grafana/provisioning/datasources/datasources.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
```

## Files to Create

1. **✅ `deployment/observability/docker-compose.yml`**

   - Complete observability stack orchestration
   - Service dependencies and networking
   - Volume mounts for persistent data

2. **✅ `deployment/observability/configs/otel-collector.yaml`**

   - OTEL Collector configuration as central hub
   - Collects logs, metrics, and traces from Task Manager
   - Forwards data to Loki, Prometheus, and Jaeger
   - Exposes Prometheus metrics endpoint for scraping

3. **✅ `deployment/observability/configs/loki.yaml`**

   - Loki log aggregation configuration
   - Receives logs from OTEL Collector
   - Storage and retention settings
   - Index and chunk management

4. **✅ `deployment/observability/configs/prometheus.yml`**

   - Prometheus configuration
   - Scrapes metrics from OTEL Collector (not Task Manager)
   - No direct dependency on Task Manager

5. **✅ `deployment/observability/configs/grafana/provisioning/datasources/datasources.yml`**

   - Auto-provisioning of Prometheus, Loki, and Jaeger data sources
   - Unified access to all observability data

6. **✅ `deployment/observability/configs/grafana/provisioning/dashboards/dashboards.yml`**

   - Auto-provisioning of dashboards
   - Dashboard management configuration

7. **✅ `deployment/observability/configs/grafana/provisioning/dashboards/json/task-manager-overview.json`**

   - Sample unified dashboard with metrics, logs, and traces
   - Task Manager specific visualizations

8. **✅ `deployment/observability/README.md`**
   - Deployment instructions
   - Service descriptions
   - Configuration details
   - Unified monitoring guide

## Testing Requirements

### 1. Infrastructure Testing

- ✅ Docker Compose services start successfully
- ✅ All services are accessible on configured ports
- ✅ Network connectivity between services
- ✅ Volume mounts work correctly

### 2. OTEL Collector Testing (Central Hub)

- ✅ OTEL Collector receives logs, metrics, and traces from Task Manager
- ✅ Logs are forwarded to Loki successfully
- ✅ Metrics are forwarded to Prometheus successfully
- ✅ Traces are forwarded to Jaeger successfully
- ✅ Prometheus metrics endpoint is exposed and accessible
- ✅ No direct scraping of Task Manager by external services

### 3. Backend Testing

- ✅ Loki accepts logs from OTEL Collector
- ✅ Prometheus scrapes metrics from OTEL Collector
- ✅ Jaeger accepts traces from OTEL Collector
- ✅ Data is queryable from each backend
- ✅ Data retention policies work

### 4. Grafana Testing

- ✅ Grafana starts with all data sources auto-provisioned
- ✅ Prometheus data source works (via OTEL Collector)
- ✅ Loki data source works (via OTEL Collector)
- ✅ Jaeger data source works (via OTEL Collector)
- ✅ Dashboards are auto-provisioned and functional
- ✅ Cross-correlation between data types works

## Success Criteria

1. **✅ Organized Structure**: All observability components properly organized
2. **✅ Central Hub**: OTEL Collector serves as central data collection and forwarding hub
3. **✅ No External Scraping**: No external services directly scrape Task Manager
4. **✅ Data Flow**: Task Manager → OTEL Collector → Backends → Grafana
5. **✅ Backend Independence**: Backends are independent and can be replaced
6. **✅ Unified Monitoring**: Grafana provides unified access to all data
7. **✅ Service Connectivity**: All services communicate properly
8. **✅ Data Persistence**: Logs, metrics, and traces are properly stored
9. **✅ Documentation**: Clear deployment and configuration documentation

## Key Architecture Benefits

1. **Centralized Data Collection**: OTEL Collector is the single point of data collection
2. **Backend Independence**: Can easily switch between different backends (Loki, Prometheus, Jaeger)
3. **No External Dependencies**: Task Manager doesn't need to expose metrics endpoints
4. **Unified Configuration**: All data flow configuration in one place
5. **Scalability**: Easy to add more services or backends
6. **Security**: Reduced attack surface (no direct external access to Task Manager)

## Estimated Time

**🔄 IN PROGRESS** - Observability infrastructure reorganization (1.5 days)

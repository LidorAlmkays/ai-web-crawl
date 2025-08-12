# Job 2: Configure OTEL Collector to Send Logs Directly to Loki

## Purpose

Implement direct OTEL Collector → Loki communication using OTLP protocol, eliminating the need for log forwarders.

## Current Issues

- OTEL Collector only exports logs to debug
- No direct communication with Loki
- Logs not appearing in Grafana Loki datasource

## Project Structure Changes

### Files to Modify

#### 1. `deployment/observability/configs/otel-collector.yaml`

**Current State:**

```yaml
exporters:
  debug:
    verbosity: detailed
  prometheus:
    endpoint: '0.0.0.0:9464'
    namespace: 'task_manager'
    const_labels:
      label1: value1
    send_timestamps: true
    metric_expiration: 180m
    enable_open_metrics: true
  otlp/traces:
    endpoint: 'tempo:4317'
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [otlp/traces, debug]
    logs:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [debug] # Only debug exporter
    metrics:
      receivers: [otlp, prometheus]
      processors: [batch, memory_limiter, resource]
      exporters: [prometheus, debug]
```

**Changes:**

- Add `otlphttp/loki` exporter
- Configure Loki OTLP endpoint
- Update logs pipeline to include Loki exporter

**New Configuration:**

```yaml
exporters:
  debug:
    verbosity: detailed
  prometheus:
    endpoint: '0.0.0.0:9464'
    namespace: 'task_manager'
    const_labels:
      label1: value1
    send_timestamps: true
    metric_expiration: 180m
    enable_open_metrics: true
  otlp/traces:
    endpoint: 'tempo:4317'
    tls:
      insecure: true
  otlphttp/loki:
    endpoint: 'http://loki:3100/otlp'
    tls:
      insecure: true
    headers:
      Content-Type: 'application/x-protobuf'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [otlp/traces, debug]
    logs:
      receivers: [otlp]
      processors: [batch, memory_limiter, resource]
      exporters: [otlphttp/loki, debug] # Add Loki exporter
    metrics:
      receivers: [otlp, prometheus]
      processors: [batch, memory_limiter, resource]
      exporters: [prometheus, debug]
```

### Files to Verify

#### 1. `deployment/observability/docker-compose.yml`

**Verify:**

- No log forwarder service exists
- OTEL Collector has proper network access to Loki
- Loki service is running and accessible

**Current State:**

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  container_name: otel-collector
  command: ['--config=/etc/otel-collector-config.yaml']
  volumes:
    - ./configs/otel-collector.yaml:/etc/otel-collector-config.yaml
  ports:
    - '4317:4317' # OTLP gRPC receiver
    - '4318:4318' # OTLP HTTP receiver
    - '9464:9464' # Prometheus metrics
  networks:
    - observability
  depends_on:
    - tempo
```

**No changes needed** - configuration is correct.

## Implementation Steps

### Step 1: Update OTEL Collector Configuration

1. Add `otlphttp/loki` exporter to `otel-collector.yaml`
2. Configure endpoint to `http://loki:3100/otlp`
3. Set TLS to insecure for testing
4. Update logs pipeline to include Loki exporter

### Step 2: Restart OTEL Collector

1. Restart OTEL Collector container
2. Verify no configuration errors
3. Check OTEL Collector logs for successful startup

### Step 3: Test Loki Connectivity

1. Verify Loki is accessible from OTEL Collector
2. Test OTLP endpoint connectivity
3. Check for any network issues

### Step 4: Verify Log Flow

1. Generate application logs
2. Check OTEL Collector receives logs
3. Verify logs appear in Loki
4. Check Grafana Loki datasource

## Test Criteria

- ✅ OTEL Collector starts without errors
- ✅ Loki OTLP endpoint is accessible
- ✅ Application logs appear in Loki via Grafana
- ✅ No log forwarder services running
- ✅ Direct OTEL Collector → Loki communication
- ✅ Clean console output (no debug spam)

## Dependencies

- Job 1 (Cleanup) must be completed first
- Loki service must be running
- Network connectivity between OTEL Collector and Loki

## Estimated Time

- 45 minutes

## Success Metrics

- Logs flow: Application → OTEL Collector → Loki → Grafana
- No intermediate services or scripts
- Clean, direct communication
- Ready for Job 3 (Enhanced OTEL SDK logging)

## Rollback Plan

If issues occur:

1. Revert `otel-collector.yaml` to previous configuration
2. Restart OTEL Collector
3. Verify application still logs to debug exporter

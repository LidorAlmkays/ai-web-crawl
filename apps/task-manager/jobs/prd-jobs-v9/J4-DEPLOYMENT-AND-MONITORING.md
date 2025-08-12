# Job 4: Deployment and Monitoring

## Overview

Set up deployment configuration, environment variables, monitoring, and alerting for the distributed tracing implementation.

## Objectives

- Configure environment variables for tracing
- Set up monitoring and alerting for trace metrics
- Create deployment documentation
- Implement gradual rollout strategy
- Set up performance monitoring

## Files to Create/Modify

### 1. Environment Configuration

**File**: `apps/task-manager/env.example` (Enhanced)

**Additions**:

```bash
# =============================================================================
# TRACING CONFIGURATION
# =============================================================================

# Enable/disable tracing
TRACING_ENABLED=true

# Trace sampling rate (0.0 to 1.0)
TRACING_SAMPLING_RATE=1.0

# OTEL Collector endpoint for traces
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service name for traces
OTEL_SERVICE_NAME=task-manager

# Service version
OTEL_SERVICE_VERSION=1.0.0

# Resource attributes
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=development

# Batch processor configuration
TRACING_MAX_QUEUE_SIZE=2048
TRACING_MAX_BATCH_SIZE=512
TRACING_DELAY_MS=5000
TRACING_TIMEOUT_MS=30000

# Performance thresholds
TRACING_PERFORMANCE_THRESHOLD_MS=1.0
TRACING_MEMORY_THRESHOLD_MB=50
```

### 2. Docker Configuration

**File**: `apps/task-manager/Dockerfile` (Enhanced)

**Additions**:

```dockerfile
# ... existing Dockerfile content ...

# Set tracing environment variables
ENV TRACING_ENABLED=true
ENV TRACING_SAMPLING_RATE=1.0
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
ENV OTEL_SERVICE_NAME=task-manager
ENV OTEL_SERVICE_VERSION=${npm_package_version:-1.0.0}
ENV OTEL_RESOURCE_ATTRIBUTES=service.version=${npm_package_version:-1.0.0},deployment.environment=production

# Performance tuning for tracing
ENV TRACING_MAX_QUEUE_SIZE=2048
ENV TRACING_MAX_BATCH_SIZE=512
ENV TRACING_DELAY_MS=5000
ENV TRACING_TIMEOUT_MS=30000

# ... rest of Dockerfile ...
```

### 3. Docker Compose Configuration

**File**: `apps/task-manager/docker-compose.yml` (Enhanced)

**Additions**:

```yaml
version: '3.8'

services:
  task-manager:
    build: .
    environment:
      # ... existing environment variables ...

      # Tracing Configuration
      - TRACING_ENABLED=true
      - TRACING_SAMPLING_RATE=1.0
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
      - OTEL_SERVICE_NAME=task-manager
      - OTEL_SERVICE_VERSION=1.0.0
      - OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=development

      # Performance Configuration
      - TRACING_MAX_QUEUE_SIZE=2048
      - TRACING_MAX_BATCH_SIZE=512
      - TRACING_DELAY_MS=5000
      - TRACING_TIMEOUT_MS=30000

      # Performance Thresholds
      - TRACING_PERFORMANCE_THRESHOLD_MS=1.0
      - TRACING_MEMORY_THRESHOLD_MB=50
    depends_on:
      - otel-collector
    networks:
      - observability

  # ... other services ...
```

### 4. Kubernetes Configuration

**File**: `apps/task-manager/k8s/deployment.yaml` (Enhanced)

**Additions**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-manager
  labels:
    app: task-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-manager
  template:
    metadata:
      labels:
        app: task-manager
    spec:
      containers:
        - name: task-manager
          image: task-manager:latest
          env:
            # ... existing environment variables ...

            # Tracing Configuration
            - name: TRACING_ENABLED
              value: 'true'
            - name: TRACING_SAMPLING_RATE
              value: '1.0'
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: 'http://otel-collector:4318/v1/traces'
            - name: OTEL_SERVICE_NAME
              value: 'task-manager'
            - name: OTEL_SERVICE_VERSION
              value: '1.0.0'
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: 'service.version=1.0.0,deployment.environment=production'

            # Performance Configuration
            - name: TRACING_MAX_QUEUE_SIZE
              value: '2048'
            - name: TRACING_MAX_BATCH_SIZE
              value: '512'
            - name: TRACING_DELAY_MS
              value: '5000'
            - name: TRACING_TIMEOUT_MS
              value: '30000'

            # Performance Thresholds
            - name: TRACING_PERFORMANCE_THRESHOLD_MS
              value: '1.0'
            - name: TRACING_MEMORY_THRESHOLD_MB
              value: '50'

          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'

          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10

          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### 5. Monitoring Configuration

**File**: `apps/task-manager/monitoring/trace-metrics.yaml`

**Implementation**:

```yaml
# Prometheus metrics for tracing
groups:
  - name: trace-metrics
    rules:
      # Trace success rate
      - alert: TraceSuccessRateLow
        expr: rate(trace_span_count{status="ERROR"}[5m]) / rate(trace_span_count[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'Trace success rate is below 95%'
          description: 'Trace success rate is {{ $value | humanizePercentage }} for the last 5 minutes'

      # Trace duration threshold
      - alert: TraceDurationHigh
        expr: histogram_quantile(0.95, rate(trace_span_duration_seconds_bucket[5m])) > 0.001
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: '95th percentile trace duration is above 1ms'
          description: '95th percentile trace duration is {{ $value }}s'

      # Trace volume monitoring
      - alert: TraceVolumeHigh
        expr: rate(trace_span_count[5m]) > 1000
        for: 2m
        labels:
          severity: info
        annotations:
          summary: 'High trace volume detected'
          description: 'Trace volume is {{ $value }} spans per second'

      # Memory usage for tracing
      - alert: TraceMemoryUsageHigh
        expr: process_resident_memory_bytes{job="task-manager"} > 50000000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage for tracing'
          description: 'Memory usage is {{ $value | humanize }}B'

      # OTEL collector connectivity
      - alert: OTELCollectorUnreachable
        expr: up{job="otel-collector"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'OTEL Collector is down'
          description: 'OTEL Collector has been down for more than 1 minute'

      # Trace export failures
      - alert: TraceExportFailures
        expr: rate(trace_export_failures_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: 'Trace export failures detected'
          description: '{{ $value }} trace export failures per second'

  # Recording rules for trace metrics
  - name: trace-recording-rules
    rules:
      # Trace success rate
      - record: trace:success_rate
        expr: rate(trace_span_count{status="OK"}[5m]) / rate(trace_span_count[5m])

      # Average trace duration
      - record: trace:avg_duration_seconds
        expr: rate(trace_span_duration_seconds_sum[5m]) / rate(trace_span_duration_seconds_count[5m])

      # 95th percentile trace duration
      - record: trace:p95_duration_seconds
        expr: histogram_quantile(0.95, rate(trace_span_duration_seconds_bucket[5m]))

      # 99th percentile trace duration
      - record: trace:p99_duration_seconds
        expr: histogram_quantile(0.99, rate(trace_span_duration_seconds_bucket[5m]))

      # Trace volume per minute
      - record: trace:volume_per_minute
        expr: rate(trace_span_count[1m]) * 60

      # Distributed trace percentage
      - record: trace:distributed_percentage
        expr: rate(trace_span_count{distributed_trace="true"}[5m]) / rate(trace_span_count[5m])
```

### 6. Grafana Dashboard

**File**: `apps/task-manager/monitoring/grafana-dashboard.json`

**Implementation**:

```json
{
  "dashboard": {
    "id": null,
    "title": "Task Manager - Distributed Tracing",
    "tags": ["task-manager", "tracing", "observability"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Trace Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "trace:success_rate",
            "legendFormat": "Success Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 0.95 },
                { "color": "green", "value": 0.99 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Trace Duration (95th Percentile)",
        "type": "stat",
        "targets": [
          {
            "expr": "trace:p95_duration_seconds * 1000",
            "legendFormat": "P95 Duration (ms)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ms",
            "min": 0,
            "max": 10,
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Trace Volume",
        "type": "graph",
        "targets": [
          {
            "expr": "trace:volume_per_minute",
            "legendFormat": "Spans per Minute"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0
          }
        }
      },
      {
        "id": 4,
        "title": "Distributed Trace Percentage",
        "type": "stat",
        "targets": [
          {
            "expr": "trace:distributed_percentage",
            "legendFormat": "Distributed Traces"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1
          }
        }
      },
      {
        "id": 5,
        "title": "Trace Duration Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(trace_span_duration_seconds_bucket[5m])",
            "legendFormat": "{{le}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"task-manager\"} / 1024 / 1024",
            "legendFormat": "Memory Usage (MB)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "MB",
            "min": 0
          }
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### 7. Deployment Script

**File**: `apps/task-manager/scripts/deploy-tracing.sh`

**Implementation**:

```bash
#!/bin/bash

# Deployment script for distributed tracing
set -e

echo "🚀 Deploying Task Manager with Distributed Tracing..."

# Configuration
ENVIRONMENT=${1:-development}
NAMESPACE=${2:-task-manager}
VERSION=${3:-latest}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [development|staging|production] [namespace] [version]"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  Namespace: $NAMESPACE"
echo "  Version: $VERSION"

# Set environment-specific configurations
case $ENVIRONMENT in
    development)
        TRACING_SAMPLING_RATE=1.0
        TRACING_ENABLED=true
        ;;
    staging)
        TRACING_SAMPLING_RATE=0.5
        TRACING_ENABLED=true
        ;;
    production)
        TRACING_SAMPLING_RATE=0.1
        TRACING_ENABLED=true
        ;;
esac

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply tracing configuration
echo "🔧 Applying tracing configuration..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-manager-tracing-config
  namespace: $NAMESPACE
data:
  TRACING_ENABLED: "$TRACING_ENABLED"
  TRACING_SAMPLING_RATE: "$TRACING_SAMPLING_RATE"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318/v1/traces"
  OTEL_SERVICE_NAME: "task-manager"
  OTEL_SERVICE_VERSION: "$VERSION"
  OTEL_RESOURCE_ATTRIBUTES: "service.version=$VERSION,deployment.environment=$ENVIRONMENT"
  TRACING_MAX_QUEUE_SIZE: "2048"
  TRACING_MAX_BATCH_SIZE: "512"
  TRACING_DELAY_MS: "5000"
  TRACING_TIMEOUT_MS: "30000"
EOF

# Deploy with rolling update
echo "🚀 Deploying Task Manager..."
kubectl set image deployment/task-manager task-manager=task-manager:$VERSION -n $NAMESPACE

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/task-manager -n $NAMESPACE --timeout=300s

# Verify deployment
echo "✅ Verifying deployment..."
kubectl get pods -n $NAMESPACE -l app=task-manager

# Check tracing endpoints
echo "🔍 Checking tracing endpoints..."
kubectl port-forward svc/task-manager 3000:3000 -n $NAMESPACE &
PORT_FORWARD_PID=$!

sleep 5

# Test health endpoint
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Health endpoint is not responding"
    kill $PORT_FORWARD_PID
    exit 1
fi

kill $PORT_FORWARD_PID

# Deploy monitoring
echo "📊 Deploying monitoring configuration..."
kubectl apply -f monitoring/trace-metrics.yaml -n $NAMESPACE

# Deploy Grafana dashboard
echo "📈 Deploying Grafana dashboard..."
kubectl apply -f monitoring/grafana-dashboard.json -n $NAMESPACE

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Check Grafana dashboard for trace metrics"
echo "  2. Monitor alerting rules"
echo "  3. Verify trace flow in Tempo"
echo "  4. Test distributed tracing scenarios"
echo ""
echo "🔗 Useful links:"
echo "  - Grafana: http://localhost:3001"
echo "  - Tempo: http://localhost:3200"
echo "  - Prometheus: http://localhost:9090"
```

### 8. Rollback Script

**File**: `apps/task-manager/scripts/rollback-tracing.sh`

**Implementation**:

```bash
#!/bin/bash

# Rollback script for distributed tracing
set -e

echo "🔄 Rolling back Task Manager tracing deployment..."

# Configuration
NAMESPACE=${1:-task-manager}
PREVIOUS_VERSION=${2:-latest}

echo "📋 Rollback Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Previous Version: $PREVIOUS_VERSION"

# Check current deployment
echo "📊 Current deployment status:"
kubectl get deployment task-manager -n $NAMESPACE

# Rollback to previous version
echo "🔄 Rolling back to version $PREVIOUS_VERSION..."
kubectl rollout undo deployment/task-manager -n $NAMESPACE

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/task-manager -n $NAMESPACE --timeout=300s

# Verify rollback
echo "✅ Verifying rollback..."
kubectl get pods -n $NAMESPACE -l app=task-manager

# Check application health
echo "🔍 Checking application health..."
kubectl port-forward svc/task-manager 3000:3000 -n $NAMESPACE &
PORT_FORWARD_PID=$!

sleep 5

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy after rollback"
else
    echo "❌ Application health check failed after rollback"
    kill $PORT_FORWARD_PID
    exit 1
fi

kill $PORT_FORWARD_PID

echo "🎉 Rollback completed successfully!"
echo ""
echo "📋 Rollback Summary:"
echo "  - Previous version: $PREVIOUS_VERSION"
echo "  - Current status: Healthy"
echo "  - Tracing: Disabled (rolled back)"
```

### 9. Performance Monitoring Script

**File**: `apps/task-manager/scripts/monitor-tracing-performance.sh`

**Implementation**:

```bash
#!/bin/bash

# Performance monitoring script for tracing
set -e

echo "📊 Monitoring Task Manager Tracing Performance..."

# Configuration
NAMESPACE=${1:-task-manager}
DURATION=${2:-300}  # 5 minutes default

echo "📋 Monitoring Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Duration: $DURATION seconds"

# Start monitoring
echo "🔍 Starting performance monitoring..."

# Monitor trace success rate
echo "📈 Trace Success Rate:"
kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep trace_success_rate || echo "No trace success rate metrics found"

# Monitor trace duration
echo "⏱️  Trace Duration (95th percentile):"
kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep trace_duration_p95 || echo "No trace duration metrics found"

# Monitor memory usage
echo "💾 Memory Usage:"
kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep process_resident_memory_bytes || echo "No memory metrics found"

# Monitor trace volume
echo "📊 Trace Volume:"
kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep trace_span_count || echo "No trace volume metrics found"

# Continuous monitoring
echo "🔄 Starting continuous monitoring for $DURATION seconds..."
for i in $(seq 1 $DURATION); do
    echo "--- Minute $((i/60 + 1)) ---"

    # Get current metrics
    SUCCESS_RATE=$(kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep trace_success_rate | grep -v '#' | awk '{print $2}' || echo "N/A")
    DURATION_P95=$(kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep trace_duration_p95 | grep -v '#' | awk '{print $2}' || echo "N/A")
    MEMORY_USAGE=$(kubectl exec -n $NAMESPACE deployment/task-manager -- curl -s http://localhost:9090/metrics | grep process_resident_memory_bytes | grep -v '#' | awk '{print $2}' || echo "N/A")

    echo "Success Rate: $SUCCESS_RATE"
    echo "Duration P95: $DURATION_P95 ms"
    echo "Memory Usage: $MEMORY_USAGE bytes"

    # Check for alerts
    if [[ "$SUCCESS_RATE" != "N/A" && $(echo "$SUCCESS_RATE < 0.95" | bc -l) -eq 1 ]]; then
        echo "⚠️  WARNING: Success rate below 95%"
    fi

    if [[ "$DURATION_P95" != "N/A" && $(echo "$DURATION_P95 > 1" | bc -l) -eq 1 ]]; then
        echo "⚠️  WARNING: Duration P95 above 1ms"
    fi

    if [[ "$MEMORY_USAGE" != "N/A" && $MEMORY_USAGE -gt 50000000 ]]; then
        echo "⚠️  WARNING: Memory usage above 50MB"
    fi

    sleep 60
done

echo "✅ Performance monitoring completed!"
```

## Deployment Strategy

### 1. Gradual Rollout Plan

**Phase 1: Development (Week 1)**

- Deploy with 100% sampling rate
- Monitor performance impact
- Validate trace flow
- Test error scenarios

**Phase 2: Staging (Week 2)**

- Deploy with 50% sampling rate
- Load testing with tracing enabled
- Validate monitoring and alerting
- Performance optimization

**Phase 3: Production (Week 3)**

- Deploy with 10% sampling rate
- Gradual rollout to 25%, 50%, 100%
- Monitor business metrics
- Full deployment

### 2. Rollback Plan

**Immediate Rollback Triggers:**

- Success rate drops below 95%
- Performance impact >1ms average
- Memory usage >50MB increase
- Critical errors in trace processing

**Rollback Procedure:**

1. Execute rollback script
2. Disable tracing via environment variable
3. Restart application
4. Verify application health
5. Investigate issues

## Success Criteria

- [ ] Environment variables properly configured
- [ ] Docker and Kubernetes configurations updated
- [ ] Monitoring and alerting rules deployed
- [ ] Grafana dashboard operational
- [ ] Deployment scripts tested and working
- [ ] Performance monitoring active
- [ ] Rollback procedures validated
- [ ] Gradual rollout plan executed
- [ ] All metrics within acceptable thresholds

## Dependencies

- Job 1: Core Tracing Infrastructure (must be completed first)
- Job 2: Business Logic Instrumentation (must be completed first)
- Job 3: Testing and Validation (must be completed first)
- Kubernetes cluster access
- Prometheus and Grafana access
- OTEL Collector deployment

## Estimated Time

**2-3 days**

## Next Steps

After completing this job, the distributed tracing implementation will be fully deployed and operational. Monitor the system for the first week to ensure stability and performance.

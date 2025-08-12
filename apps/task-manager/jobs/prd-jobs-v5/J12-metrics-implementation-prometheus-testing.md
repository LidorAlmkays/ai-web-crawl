# Job 12: Metrics Implementation and OTEL Testing (Simplified)

## Objective

Test and verify the simplified Task Manager metrics implementation for web-crawl counts (new, completed, error) over a configurable time window. Ensure OTEL Collector can scrape `/metrics` successfully and forward to Prometheus.

## Status: 🔄 IN PROGRESS

## Current State Analysis

### Issues to Verify

- ❌ Metrics tested against configurable hours (not hardcoded 24h)
- ❌ OTEL Collector scraping of `/metrics`
- ❌ JSON endpoint returns expected counts and timestamp
- ❌ OTEL Collector forwards metrics to Prometheus

## Requirements

### 1. Metrics Implementation Testing

- ✅ New tasks count over hoursBack
- ✅ Completed tasks count over hoursBack
- ✅ Error tasks count over hoursBack
- ✅ Config default used when `?hours` not provided

### 2. OTEL Integration Testing

- ✅ `/metrics` returns Prometheus format text
- ✅ Headers set correctly (content-type, no-cache)
- ✅ Query param `?hours=` changes values accordingly
- ✅ OTEL Collector scrapes `/metrics` endpoint
- ✅ OTEL Collector forwards metrics to Prometheus

### 3. JSON Metrics Endpoint

- ✅ `/metrics/json` returns JSON with: `timestamp`, `timeRange`, `metrics` (new/completed/error), `lastUpdated`

## Implementation References

- Application: `WebCrawlMetricsService` (uses `IWebCrawlMetricsDataPort`)
- Infra: `WebCrawlMetricsAdapter` (calls SQL functions)
- SQL: `get_new_tasks_count(hours)`, `get_completed_tasks_count(hours)`, `get_error_tasks_count(hours)`, `get_web_crawl_metrics(hours)`
- OTEL: Collector scrapes `/metrics` and forwards to Prometheus

## Test Cases

1. GET `/metrics` (no hours) → uses default `metrics.defaultTimeRangeHours`
2. GET `/metrics?hours=1` → returns recent counts
3. GET `/metrics/json?hours=12` → JSON payload matches structure
4. Invalid `?hours=abc` → 400 or fallback behavior (decide per router spec)
5. OTEL Collector scrapes `/metrics` → metrics appear in Prometheus
6. OTEL Collector forwards to Prometheus → Grafana can query metrics

## OTEL Collector Configuration

```yaml
# otel-collector.yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'task-manager'
          static_configs:
            - targets: ['host.docker.internal:3000']
          metrics_path: '/metrics'
          scrape_interval: 15s

processors:
  batch:

exporters:
  prometheus:
    endpoint: '0.0.0.0:9464'

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [prometheus]
```

## Testing Scripts

- `scripts/test-metrics-endpoint.js`: fetch `/metrics`, assert content-type and contains expected HELP/TYPE lines
- `scripts/test-metrics-json.js`: fetch `/metrics/json?hours=6`, assert numeric fields and timeRange
- `scripts/test-otel-scraping.js`: verify OTEL Collector scrapes and forwards metrics

## Expected Results

- ✅ `/metrics` accessible and formatted for OTEL Collector
- ✅ `/metrics/json` returns accurate numbers and timeRange label
- ✅ Changing `?hours=` changes results accordingly
- ✅ OTEL Collector successfully scrapes `/metrics`
- ✅ Metrics appear in Prometheus via OTEL Collector
- ✅ No direct Prometheus configuration in Task Manager

## Success Criteria

- Green tests for endpoints with and without `?hours`
- Verified OTEL Collector scraping
- Verified metrics flow: Task Manager → OTEL Collector → Prometheus
- No reliance on hardcoded 24h
- No direct Prometheus configuration in Task Manager

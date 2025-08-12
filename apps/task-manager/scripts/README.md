# Distributed Tracing Test Scripts

This directory contains scripts for testing the distributed tracing functionality of the task-manager application.

## Files

- `test-distributed-tracing.ts` - TypeScript version of the test (requires compilation)
- `run-tracing-test.js` - JavaScript version of the test (can run directly)
- `README.md` - This file

## Quick Start

### Prerequisites

1. **Ensure the observability stack is running**:

   ```bash
   # Check if observability services are running
   docker ps | grep -E "(otel-collector|tempo|grafana|kafka)"
   ```

2. **If not running, start the observability stack**:

   ```bash
   cd deployment/observability
   docker-compose up -d
   ```

3. **Run the distributed tracing test**:
   ```bash
   npm run test:tracing
   ```

### What the Test Does

The test script sends 4 Kafka messages with W3C trace context:

1. **New Task Message** - Creates a new web crawl task
2. **Complete Task Message** - Marks the task as completed (same trace)
3. **Error Task Message** - Marks the task as errored (same trace)
4. **Another New Task** - Creates a second task (different trace)

### Expected Trace Structure

```
Gateway Trace: 4bf92f3577b34da6a3ce929d0e0e4736
├── Gateway Span: 00f067aa0ba902b7 (Parent)
└── Task-Manager Spans:
    ├── kafka.new_task_processing (Child)
    │   ├── headers_validated
    │   ├── body_validated
    │   ├── create_web_crawl_task (Child)
    │   │   ├── domain_entity_created
    │   │   └── database_create_web_crawl_task (Child)
    │   │       ├── database_query_executing
    │   │       └── database_query_successful
    │   └── task_created
    ├── kafka.complete_task_processing (Child)
    │   ├── headers_extracted
    │   ├── body_validated
    │   ├── update_web_crawl_task_status (Child)
    │   │   ├── task_retrieved
    │   │   ├── domain_entity_updated
    │   │   └── database_update_web_crawl_task (Child)
    │   └── task_completed
    └── kafka.error_task_processing (Child)
        ├── headers_extracted
        ├── body_validated
        ├── update_web_crawl_task_status (Child)
        └── task_errored
```

## Verification Steps

### 1. Check Grafana

1. Open Grafana at http://localhost:3001
2. Login with `admin/admin`
3. Navigate to **Explore**
4. Select **Tempo** as the data source
5. Search for traces with:
   - Service name: `task-manager`
   - Operation: `kafka.new_task_processing`
   - Time range: Last 15 minutes

### 2. Look for Test Traces

Search for these specific trace IDs in Grafana:

- `4bf92f3577b34da6a3ce929d0e0e4736` (main test trace)
- Look for child spans under this trace

### 3. Verify Trace Context Propagation

1. **Parent-Child Relationships**: Verify that all spans are properly linked
2. **Trace Attributes**: Check that Kafka headers are captured as attributes
3. **Service Names**: Ensure all spans have `service.name="task-manager"`
4. **Operation Names**: Verify operation names match the expected structure

### 4. Check OTEL Collector Logs

```bash
docker logs otel-collector
```

Look for:

- Received traces
- Forwarded traces to Tempo
- Any errors or warnings

### 5. Check Task Manager Logs

```bash
# If running locally
npm run serve

# If running in Docker
docker logs <task-manager-container-name>
```

Look for:

- Trace context extraction
- Span creation
- Kafka message processing

## Troubleshooting

### No Traces Appearing

1. **Check Kafka connectivity**:

   ```bash
   docker logs kafka
   ```

2. **Verify task-manager is processing messages**:

   ```bash
   # If running locally
   npm run serve | grep "kafka"

   # If running in Docker
   docker logs <task-manager-container-name> | grep "kafka"
   ```

3. **Check OTEL Collector configuration**:
   ```bash
   docker logs otel-collector
   ```

### Traces Appearing but Not Linked

1. **Verify W3C trace context format**:

   - Should be: `00-{traceId}-{spanId}-01`
   - Example: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`

2. **Check trace context extraction**:
   - Look for "headers_extracted" events in spans
   - Verify traceparent header is being parsed

### Performance Issues

1. **Check sampling rate**:

   - Development: 100% (`TRACING_SAMPLING_RATE=1.0`)
   - Production: 10% (`TRACING_SAMPLING_RATE=0.1`)

2. **Monitor resource usage**:
   ```bash
   docker stats
   ```

## Test Data

The test uses these specific values:

- **Trace ID**: `4bf92f3577b34da6a3ce929d0e0e4736`
- **Span ID**: `00f067aa0ba902b7`
- **Task Type**: `web-crawl`
- **User Email**: `test@example.com`
- **Base URL**: `https://example.com`

## Customization

You can modify the test by editing `run-tracing-test.js`:

- Change trace IDs
- Modify message content
- Add more test scenarios
- Adjust timing between messages

## Integration with CI/CD

This test can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Test Distributed Tracing
  run: |
    cd apps/task-manager
    # Ensure observability stack is running
    cd ../deployment/observability
    docker-compose up -d
    sleep 30  # Wait for services
    cd ../../apps/task-manager
    npm run test:tracing
```

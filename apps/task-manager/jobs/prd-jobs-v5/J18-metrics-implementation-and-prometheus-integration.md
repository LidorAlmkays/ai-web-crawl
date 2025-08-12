# Job 18: Metrics Implementation and OTEL Integration (Simplified)

## Objective

Implement minimal metrics for Task Manager: counts of web-crawl tasks (new, completed, error) over a configurable time range, exposed via a single REST router. OTEL Collector will scrape the `/metrics` endpoint and forward to Prometheus.

## Status: 🔄 IN PROGRESS

## Cleanup Phase - Files to Remove

Before implementing the new simplified metrics, we need to remove all old metrics-related code:

### Files to Delete:

1. **`src/api/rest/metrics.router.ts`**

   - **Why**: We're consolidating all REST endpoints into a single `rest.router.ts`
   - **Impact**: Contains multiple metrics endpoints that will be moved to `rest.router.ts`

2. **`src/common/metrics/enhanced-metrics.service.ts`**

   - **Why**: Overly complex metrics service with multiple responsibilities
   - **Impact**: Will be replaced by simple `WebCrawlMetricsService` in application layer

3. **`src/common/metrics/business-metrics.service.ts`**

   - **Why**: Business metrics service that's too complex for our simplified approach
   - **Impact**: Functionality will be consolidated into `WebCrawlMetricsService`

4. **`src/common/metrics/metrics.service.ts`**

   - **Why**: Generic metrics service that doesn't follow our layered architecture
   - **Impact**: Will be replaced by application layer service

5. **`src/common/metrics/metrics.interface.ts`**

   - **Why**: Generic interface that doesn't match our specific web-crawl metrics needs
   - **Impact**: Will be replaced by `IWebCrawlMetricsDataPort` in application layer

6. **`src/common/metrics/metrics.types.ts`**

   - **Why**: Generic types that don't match our domain-specific needs
   - **Impact**: Will be replaced by `WebCrawlMetrics` type in domain layer

7. **`src/common/metrics/simple-metrics.interface.ts`**

   - **Why**: Simple metrics interface that's in wrong layer (common instead of application)
   - **Impact**: Will be replaced by `IWebCrawlMetricsDataPort` in application layer

8. **`src/common/metrics/simple-metrics.service.ts`**
   - **Why**: Simple metrics service that's in wrong layer (common instead of application)
   - **Impact**: Will be replaced by `WebCrawlMetricsService` in application layer

### Files to Modify:

1. **`src/api/rest/rest.router.ts`**

   - **Why**: Need to add metrics endpoints (`/metrics`, `/metrics/json`) to this single router
   - **Impact**: Will consume `WebCrawlMetricsService` directly

2. **`src/app.ts`**

   - **Why**: Need to wire up new `WebCrawlMetricsService` and remove old metrics router
   - **Impact**: Will create and inject the new service

3. **`src/application/services/application.factory.ts`**
   - **Why**: Need to add factory method for `WebCrawlMetricsService`
   - **Impact**: Will create the service with its dependencies

### Why This Cleanup:

- **Simplification**: Remove complex, multi-purpose metrics services
- **Layered Architecture**: Move metrics logic to proper layers (application, not common)
- **Single Router**: Consolidate all REST endpoints into one router
- **Clear Dependencies**: Remove circular dependencies and unclear interfaces
- **OTEL Integration**: Prepare for OTEL Collector scraping instead of direct Prometheus

### After Cleanup:

- Only `rest.router.ts` will handle all REST endpoints
- Application layer will contain `WebCrawlMetricsService`
- Infrastructure layer will contain `WebCrawlMetricsAdapter`
- Domain layer will contain `WebCrawlMetrics` type
- Config layer will contain metrics configuration

## Implementation Plan - Files to Create

After cleanup, I'll create the following new files with their structure:

### 1. Configuration Layer

**`src/config/metrics.ts`**

```typescript
export interface MetricsConfig {
  defaultTimeRangeHours: number;
  availableTimeRanges: number[];
  refreshIntervalSeconds: number;
}

export const metricsConfig: MetricsConfig = {
  defaultTimeRangeHours: 24,
  availableTimeRanges: [1, 6, 12, 24, 48, 72],
  refreshIntervalSeconds: 15,
};
```

### 2. Domain Layer

**`src/domain/types/metrics.types.ts`**

```typescript
export interface WebCrawlMetrics {
  newTasksCount: number;
  completedTasksCount: number;
  errorTasksCount: number;
  timeRange: string;
  timestamp: string;
  lastUpdated: string;
}

export interface MetricsQueryParams {
  hours?: number;
}
```

### 3. Application Layer

**`src/application/metrics/ports/IWebCrawlMetricsDataPort.ts`**

```typescript
import { WebCrawlMetrics } from '../../../domain/types/metrics.types';

export interface IWebCrawlMetricsDataPort {
  getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics>;
  getNewTasksCount(hours: number): Promise<number>;
  getCompletedTasksCount(hours: number): Promise<number>;
  getErrorTasksCount(hours: number): Promise<number>;
}
```

**`src/application/metrics/services/WebCrawlMetricsService.ts`**

```typescript
import { IWebCrawlMetricsDataPort } from '../ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetrics, MetricsQueryParams } from '../../../domain/types/metrics.types';
import { metricsConfig } from '../../../config/metrics';

export class WebCrawlMetricsService {
  constructor(private readonly metricsDataPort: IWebCrawlMetricsDataPort) {}

  async getMetrics(params?: MetricsQueryParams): Promise<WebCrawlMetrics> {
    const hours = params?.hours || metricsConfig.defaultTimeRangeHours;
    return this.metricsDataPort.getWebCrawlMetrics(hours);
  }

  async getPrometheusFormat(params?: MetricsQueryParams): Promise<string> {
    const metrics = await this.getMetrics(params);
    const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

    return `# HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last ${hours}h
# TYPE web_crawl_new_tasks_total counter
web_crawl_new_tasks_total{time_range="${hours}h"} ${metrics.newTasksCount}

# HELP web_crawl_completed_tasks_total Number of completed web crawl tasks in the last ${hours}h
# TYPE web_crawl_completed_tasks_total counter
web_crawl_completed_tasks_total{time_range="${hours}h"} ${metrics.completedTasksCount}

# HELP web_crawl_error_tasks_total Number of error web crawl tasks in the last ${hours}h
# TYPE web_crawl_error_tasks_total counter
web_crawl_error_tasks_total{time_range="${hours}h"} ${metrics.errorTasksCount}`;
  }
}
```

### 4. Infrastructure Layer

**`src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts`**

```typescript
import { Pool } from 'pg';
import { IWebCrawlMetricsDataPort } from '../../../../application/metrics/ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetrics } from '../../../../domain/types/metrics.types';

export class WebCrawlMetricsAdapter implements IWebCrawlMetricsDataPort {
  constructor(private readonly pool: Pool) {}

  async getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics> {
    const [newCount, completedCount, errorCount] = await Promise.all([this.getNewTasksCount(hours), this.getCompletedTasksCount(hours), this.getErrorTasksCount(hours)]);

    const now = new Date().toISOString();
    const timeRange = `${hours}h`;

    return {
      newTasksCount: newCount,
      completedTasksCount: completedCount,
      errorTasksCount: errorCount,
      timeRange,
      timestamp: now,
      lastUpdated: now,
    };
  }

  async getNewTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query('SELECT get_new_tasks_count($1) as count', [hours]);
    return parseInt(result.rows[0].count);
  }

  async getCompletedTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query('SELECT get_completed_tasks_count($1) as count', [hours]);
    return parseInt(result.rows[0].count);
  }

  async getErrorTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query('SELECT get_error_tasks_count($1) as count', [hours]);
    return parseInt(result.rows[0].count);
  }
}
```

### 5. Database Schema

**`src/infrastructure/persistence/postgres/schema/08-metrics-functions.sql`**

```sql
-- Function to get new tasks count for given hours
CREATE OR REPLACE FUNCTION get_new_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE status = 'NEW'
    AND created_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get completed tasks count for given hours
CREATE OR REPLACE FUNCTION get_completed_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE status = 'COMPLETED'
    AND updated_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get error tasks count for given hours
CREATE OR REPLACE FUNCTION get_error_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE status = 'ERROR'
    AND updated_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get all web crawl metrics for given hours
CREATE OR REPLACE FUNCTION get_web_crawl_metrics(hours INTEGER)
RETURNS TABLE(
  new_tasks_count INTEGER,
  completed_tasks_count INTEGER,
  error_tasks_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    get_new_tasks_count(hours),
    get_completed_tasks_count(hours),
    get_error_tasks_count(hours);
END;
$$ LANGUAGE plpgsql;
```

### 6. Updated Existing Files

**`src/application/services/application.factory.ts`** (add method)

```typescript
// Add to existing factory
createWebCrawlMetricsService(
  metricsDataPort: IWebCrawlMetricsDataPort
): WebCrawlMetricsService {
  return new WebCrawlMetricsService(metricsDataPort);
}
```

**`src/api/rest/rest.router.ts`** (add endpoints)

```typescript
// Add to existing router
router.get('/metrics', async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : undefined;
    const prometheusFormat = await webCrawlMetricsService.getPrometheusFormat({ hours });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(prometheusFormat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

router.get('/metrics/json', async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : undefined;
    const metrics = await webCrawlMetricsService.getMetrics({ hours });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});
```

**`src/app.ts`** (wire up dependencies)

```typescript
// Add to existing app.ts
const webCrawlMetricsAdapter = new WebCrawlMetricsAdapter(postgresFactory.getPool());
const webCrawlMetricsService = applicationFactory.createWebCrawlMetricsService(webCrawlMetricsAdapter);

const restRouter = createRestRouter({
  healthCheckService: postgresFactory.getHealthCheckService(),
  webCrawlMetricsService, // Add this
});
```

**`src/infrastructure/persistence/postgres/schema/00-main.sql`** (add reference)

```sql
-- Add at the end of the file
\i 08-metrics-functions.sql
```

## Architecture

- **API Layer**: `rest.router.ts` exposes `/metrics` (Prometheus format) and `/metrics/json` - **OTEL Collector extracts from here**
- **Application Layer**: `WebCrawlMetricsService` computes metrics using domain types, uses config default time window
- **Ports**: `IWebCrawlMetricsDataPort` for data access from app layer
- **Infrastructure Layer**: `WebCrawlMetricsAdapter` calls SQL functions
- **Domain Layer**: Defines `WebCrawlMetrics` type used by application layer
- **SQL**: `get_*_count(hours)` and `get_web_crawl_metrics(hours)` functions
- **OTEL**: Collector scrapes `/metrics` endpoint from API layer and forwards to Prometheus

## Data Flow

```
Task Manager API (/metrics) → OTEL Collector → Prometheus → Grafana
```

**Detailed Flow:**

1. **API Layer** (`rest.router.ts`) receives request for `/metrics`
2. **API Layer** calls **Application Service** (`WebCrawlMetricsService`)
3. **Application Service** uses **Domain Types** (`WebCrawlMetrics`) and calls **Application Port** (`IWebCrawlMetricsDataPort`)
4. **Infrastructure Adapter** (`WebCrawlMetricsAdapter`) implements the port and calls **SQL Functions**
5. **API Layer** returns Prometheus format to **OTEL Collector**
6. **OTEL Collector** forwards to **Prometheus**

## Requirements

- Single REST router; no separate metrics router
- Configurable hours via config with optional `?hours` override
- Strict layering (API → Application Service → App Port → Infra Adapter → SQL functions)
- **OTEL Collector scrapes `/metrics` endpoint from API layer**
- No direct Prometheus configuration in Task Manager
- **Domain types used by application layer, not pushed to it**

## Endpoints

- GET `/metrics` → Prometheus text format, with HELP/TYPE and values for new/completed/error, labeled with `time_range`
- GET `/metrics/json` → `{ timestamp, timeRange, metrics: { newTasksCount, completedTasksCount, errorTasksCount }, lastUpdated }`

## OTEL Collector Configuration

The OTEL Collector will be configured to scrape the Task Manager metrics endpoint:

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

## Implementation Steps

1. **Cleanup Phase**: Remove all old metrics files listed above
2. Create `config/metrics.ts` with defaults and available ranges
3. Add domain type `WebCrawlMetrics`
4. Add app port `IWebCrawlMetricsDataPort`
5. Implement `WebCrawlMetricsService`
6. Implement `WebCrawlMetricsAdapter` (PG)
7. Add SQL functions file under postgres schema
8. Update `rest.router.ts` to include metrics endpoints
9. Wire in `app.ts` (create adapter, create service, inject into router factory)
10. Verify OTEL Collector scrapes `/metrics` successfully

## Prometheus Format Output Example

```
# HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last 24h
# TYPE web_crawl_new_tasks_total counter
web_crawl_new_tasks_total{time_range="24h"} 42

# HELP web_crawl_completed_tasks_total Number of completed web crawl tasks in the last 24h
# TYPE web_crawl_completed_tasks_total counter
web_crawl_completed_tasks_total{time_range="24h"} 27

# HELP web_crawl_error_tasks_total Number of error web crawl tasks in the last 24h
# TYPE web_crawl_error_tasks_total counter
web_crawl_error_tasks_total{time_range="24h"} 5
```

Note: `24h` is the default; actual label reflects configured or requested hours.

## Testing

- Unit tests for service with mocked port
- Integration tests for router endpoints
- OTEL Collector scraping verification
- Optional E2E test with real SQL functions in test DB

## Success Criteria

- Endpoints return correct format and counts
- Configurable time window works
- Strict layering enforced; no API ports
- OTEL Collector successfully scrapes `/metrics`
- Old metrics router removed
- No direct Prometheus configuration in Task Manager

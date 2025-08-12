# Job 19: Grafana Jaeger Datasource Fix and Metrics Architecture Refactor

## Objective

Fix the Grafana Jaeger datasource plugin installation issue and refactor the metrics architecture to follow proper layered architecture with metrics services in the application layer, ports for infrastructure layer, and SQL functions in infrastructure layer.

## Status: 🔄 IN PROGRESS

## Current Issues

### 1. Grafana Jaeger Datasource Plugin Error

**Error**: `grafana-jaeger-datasource` plugin installation failing

```
logger=plugin.backgroundinstaller t=2025-08-10T20:37:06.827180822Z level=info msg="Installing plugin" pluginId=grafana-jaeger-datasource version=
Error: ✗ failed to install plugin grafana-jaeger-datasource@: 404: Plugin not found
```

**Impact**: Jaeger traces not visible in Grafana
**Root Cause**: Plugin compatibility or installation method issue

**Current Configuration**:

- Docker Compose tries to install: `GF_INSTALL_PLUGINS=grafana-jaeger-datasource`
- Datasource config uses: `type: jaeger` (should be `type: grafana-jaeger-datasource`)

**Proposed Fix**:

1. Update Docker Compose to use: `GF_INSTALL_PLUGINS=grafana-jaeger-datasource@latest`
2. Add: `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-jaeger-datasource`
3. Update datasource type to: `type: grafana-jaeger-datasource`

### 2. Metrics Architecture Issues

**Current Problems**:

- Metrics logic scattered across common utilities (wrong layer)
- No clear separation between application layer and API layer
- Metrics endpoints directly accessing business logic
- Complex Prometheus exporter management
- No database-driven metrics extraction
- Hardcoded 24h time periods
- No proper port-based architecture
- **Application layer accessing adapters directly instead of ports**

**User Requirements**:

1. **Application Layer**: Move all metrics logic to application layer with proper services
2. **Infrastructure Layer**: SQL functions for data access (not raw SQL)
3. **Configurable Time Periods**: Metrics time ranges configurable via config
4. **Single REST Router**: Centralized REST router for all endpoints
5. **Clean Architecture**: Proper separation of concerns following layered architecture
6. **Port-Based Access**: Application layer only accesses infrastructure through ports

## Proposed Architecture

### Current Structure (To Be Refactored)

```
src/
├── common/metrics/           # ❌ Wrong layer - should be in application
│   ├── metrics.service.ts
│   ├── business-metrics.service.ts
│   ├── enhanced-metrics.service.ts
│   └── metrics.types.ts
└── api/rest/
    ├── metrics.router.ts     # ❌ Mixed concerns
    ├── health-check.router.ts
    └── rest.router.ts
```

### Target Structure (Proper Layered Architecture)

```
src/
├── api/                     # ✅ API Layer (Presentation)
│   └── rest/
│       ├── rest.router.ts  # Single unified REST router
│       └── index.ts
├── application/             # ✅ Application Layer (Business Logic)
│   ├── metrics/
│   │   ├── ports/          # Ports for application layer to use
│   │   │   └── IWebCrawlMetricsDataPort.ts # Data access port
│   │   ├── services/       # Business logic implementation
│   │   │   └── WebCrawlMetricsService.ts   # Web-crawl metrics service
│   │   └── index.ts
│   └── index.ts
├── infrastructure/          # ✅ Infrastructure Layer (Data Access)
│   ├── persistence/
│   │   └── postgres/
│   │       ├── schema/
│   │       │   └── 08-metrics-functions.sql # SQL functions for metrics
│   │       └── adapters/
│   │           └── WebCrawlMetricsAdapter.ts # Implements IWebCrawlMetricsDataPort
│   └── index.ts
├── config/                  # ✅ Configuration Layer
│   ├── metrics.ts           # Metrics configuration
│   └── index.ts
└── domain/                  # ✅ Domain Layer (Core Models)
    └── types/
        └── metrics.types.ts # Shared domain types
```

## Layer Dependencies (Proper Flow)

```
API Layer (rest.router.ts)
    ↓ (uses)
Application Services (WebCrawlMetricsService)
    ↓ (uses)
Application Ports (IWebCrawlMetricsDataPort)
    ↓ (implemented by)
Infrastructure Adapters (WebCrawlMetricsAdapter)
    ↓ (uses)
Database (SQL Functions)
```

## Implementation Plan

### Phase 1: Grafana Jaeger Plugin Fix

1. **Update Docker Compose Configuration**

   - Add `@latest` version to plugin installation
   - Add unsigned plugin loading permission
   - Test plugin installation

2. **Update Datasource Configuration**

   - Change type from `jaeger` to `grafana-jaeger-datasource`
   - Verify datasource connectivity

3. **Test Integration**
   - Verify Jaeger traces appear in Grafana
   - Test trace visualization

### Phase 2: Metrics Configuration

#### 2.1 Create Metrics Configuration

```typescript
// config/metrics.ts
export interface MetricsConfig {
  defaultTimeRangeHours: number;
  availableTimeRanges: number[];
  refreshIntervalMs: number;
  prometheusEnabled: boolean;
}

export const metricsConfig: MetricsConfig = {
  defaultTimeRangeHours: 24,
  availableTimeRanges: [1, 6, 12, 24, 48, 72, 168], // 1h, 6h, 12h, 24h, 48h, 72h, 7d
  refreshIntervalMs: 30000, // 30 seconds
  prometheusEnabled: true,
};
```

### Phase 3: Domain Types

#### 3.1 Create Shared Domain Types

```typescript
// domain/types/metrics.types.ts
export interface WebCrawlMetrics {
  newTasksCount: number;
  completedTasksCount: number;
  errorTasksCount: number;
  lastUpdated: string;
}

export interface MetricsConfig {
  defaultTimeRangeHours: number;
  availableTimeRanges: number[];
  refreshIntervalMs: number;
  prometheusEnabled: boolean;
}
```

### Phase 4: SQL Functions Creation

#### 4.1 Create Base SQL Functions

   ```sql
-- infrastructure/persistence/postgres/schema/08-metrics-functions.sql

-- Base function for time range queries
   CREATE OR REPLACE FUNCTION get_tasks_by_status_and_time(
     p_status task_status,
     p_hours_back INTEGER DEFAULT 24
   ) RETURNS INTEGER AS $$
   DECLARE
     task_count INTEGER;
   BEGIN
     SELECT COUNT(*) INTO task_count
     FROM web_crawl_tasks
     WHERE status = p_status
     AND created_at >= NOW() - INTERVAL '1 hour' * p_hours_back;

     RETURN task_count;
   END;
   $$ LANGUAGE plpgsql;

   -- Function for new tasks
   CREATE OR REPLACE FUNCTION get_new_tasks_count(p_hours_back INTEGER DEFAULT 24)
   RETURNS INTEGER AS $$
   BEGIN
     RETURN get_tasks_by_status_and_time('new', p_hours_back);
   END;
   $$ LANGUAGE plpgsql;

   -- Function for completed tasks
   CREATE OR REPLACE FUNCTION get_completed_tasks_count(p_hours_back INTEGER DEFAULT 24)
   RETURNS INTEGER AS $$
   BEGIN
     RETURN get_tasks_by_status_and_time('completed', p_hours_back);
   END;
   $$ LANGUAGE plpgsql;

   -- Function for error tasks
   CREATE OR REPLACE FUNCTION get_error_tasks_count(p_hours_back INTEGER DEFAULT 24)
   RETURNS INTEGER AS $$
   BEGIN
     RETURN get_tasks_by_status_and_time('error', p_hours_back);
   END;
   $$ LANGUAGE plpgsql;

-- Function to get all metrics in one call
CREATE OR REPLACE FUNCTION get_web_crawl_metrics(p_hours_back INTEGER DEFAULT 24)
RETURNS TABLE(
  new_tasks_count INTEGER,
  completed_tasks_count INTEGER,
  error_tasks_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    get_new_tasks_count(p_hours_back) as new_tasks_count,
    get_completed_tasks_count(p_hours_back) as completed_tasks_count,
    get_error_tasks_count(p_hours_back) as error_tasks_count;
END;
$$ LANGUAGE plpgsql;
```

### Phase 5: Infrastructure Layer Implementation

#### 5.1 Create Infrastructure Adapter

   ```typescript
   // infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts
import { Pool } from 'pg';
import { IWebCrawlMetricsDataPort } from '../../../application/metrics/ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetrics } from '../../../domain/types/metrics.types';
import { logger } from '../../../common/utils/logger';

export class WebCrawlMetricsAdapter implements IWebCrawlMetricsDataPort {
  constructor(private readonly databasePool: Pool) {
    logger.info('WebCrawlMetricsAdapter initialized');
  }

     async getNewTasksCount(hoursBack: number): Promise<number> {
    try {
       const result = await this.databasePool.query('SELECT get_new_tasks_count($1) as count', [hoursBack]);
      const count = parseInt(result.rows[0].count);
      logger.debug('New tasks count retrieved from database', { count, hoursBack });
      return count;
    } catch (error) {
      logger.error('Failed to get new tasks count from database', {
        hoursBack,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
     }

     async getCompletedTasksCount(hoursBack: number): Promise<number> {
    try {
       const result = await this.databasePool.query('SELECT get_completed_tasks_count($1) as count', [hoursBack]);
      const count = parseInt(result.rows[0].count);
      logger.debug('Completed tasks count retrieved from database', { count, hoursBack });
      return count;
    } catch (error) {
      logger.error('Failed to get completed tasks count from database', {
        hoursBack,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
     }

     async getErrorTasksCount(hoursBack: number): Promise<number> {
    try {
       const result = await this.databasePool.query('SELECT get_error_tasks_count($1) as count', [hoursBack]);
      const count = parseInt(result.rows[0].count);
      logger.debug('Error tasks count retrieved from database', { count, hoursBack });
      return count;
    } catch (error) {
      logger.error('Failed to get error tasks count from database', {
        hoursBack,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAllMetrics(hoursBack: number): Promise<WebCrawlMetrics> {
    try {
      const result = await this.databasePool.query('SELECT * FROM get_web_crawl_metrics($1)', [hoursBack]);
      const row = result.rows[0];

      const metrics: WebCrawlMetrics = {
        newTasksCount: parseInt(row.new_tasks_count),
        completedTasksCount: parseInt(row.completed_tasks_count),
        errorTasksCount: parseInt(row.error_tasks_count),
        lastUpdated: new Date().toISOString(),
      };

      logger.debug('All metrics retrieved from database', { metrics, hoursBack });
      return metrics;
    } catch (error) {
      logger.error('Failed to get all metrics from database', {
        hoursBack,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
```

### Phase 6: Application Layer Implementation

#### 6.1 Create Application Port

```typescript
// application/metrics/ports/IWebCrawlMetricsDataPort.ts
import { WebCrawlMetrics } from '../../../domain/types/metrics.types';

export interface IWebCrawlMetricsDataPort {
  getNewTasksCount(hoursBack: number): Promise<number>;
  getCompletedTasksCount(hoursBack: number): Promise<number>;
  getErrorTasksCount(hoursBack: number): Promise<number>;
  getAllMetrics(hoursBack: number): Promise<WebCrawlMetrics>;
}
```

#### 6.2 Create Application Service

```typescript
// application/metrics/services/WebCrawlMetricsService.ts
import { IWebCrawlMetricsDataPort } from '../ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetrics, MetricsConfig } from '../../../domain/types/metrics.types';
import { logger } from '../../../common/utils/logger';

export class WebCrawlMetricsService {
  constructor(private readonly metricsDataPort: IWebCrawlMetricsDataPort, private readonly config: MetricsConfig) {
    logger.info('WebCrawlMetricsService initialized');
  }

  async getNewTasksCount(hoursBack?: number): Promise<number> {
    const timeRange = hoursBack ?? this.config.defaultTimeRangeHours;
    logger.debug('Getting new tasks count', { timeRange });

    try {
      const count = await this.metricsDataPort.getNewTasksCount(timeRange);
      logger.debug('New tasks count retrieved', { count, timeRange });
      return count;
    } catch (error) {
      logger.error('Failed to get new tasks count', {
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getCompletedTasksCount(hoursBack?: number): Promise<number> {
    const timeRange = hoursBack ?? this.config.defaultTimeRangeHours;
    logger.debug('Getting completed tasks count', { timeRange });

    try {
      const count = await this.metricsDataPort.getCompletedTasksCount(timeRange);
      logger.debug('Completed tasks count retrieved', { count, timeRange });
      return count;
    } catch (error) {
      logger.error('Failed to get completed tasks count', {
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getErrorTasksCount(hoursBack?: number): Promise<number> {
    const timeRange = hoursBack ?? this.config.defaultTimeRangeHours;
    logger.debug('Getting error tasks count', { timeRange });

    try {
      const count = await this.metricsDataPort.getErrorTasksCount(timeRange);
      logger.debug('Error tasks count retrieved', { count, timeRange });
      return count;
    } catch (error) {
      logger.error('Failed to get error tasks count', {
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAllMetrics(hoursBack?: number): Promise<WebCrawlMetrics> {
    const timeRange = hoursBack ?? this.config.defaultTimeRangeHours;
    logger.debug('Getting all metrics', { timeRange });

    try {
      const metrics = await this.metricsDataPort.getAllMetrics(timeRange);
      logger.debug('All metrics retrieved', { metrics, timeRange });
      return metrics;
    } catch (error) {
      logger.error('Failed to get all metrics', {
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getPrometheusMetrics(hoursBack?: number): Promise<string> {
    const timeRange = hoursBack ?? this.config.defaultTimeRangeHours;
    logger.debug('Generating Prometheus metrics', { timeRange });

    try {
      const metrics = await this.getAllMetrics(timeRange);

      const prometheusMetrics = [`# HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last ${timeRange}h`, `# TYPE web_crawl_new_tasks_total counter`, `web_crawl_new_tasks_total{time_range="${timeRange}h"} ${metrics.newTasksCount}`, '', `# HELP web_crawl_completed_tasks_total Number of completed web crawl tasks in the last ${timeRange}h`, `# TYPE web_crawl_completed_tasks_total counter`, `web_crawl_completed_tasks_total{time_range="${timeRange}h"} ${metrics.completedTasksCount}`, '', `# HELP web_crawl_error_tasks_total Number of error web crawl tasks in the last ${timeRange}h`, `# TYPE web_crawl_error_tasks_total counter`, `web_crawl_error_tasks_total{time_range="${timeRange}h"} ${metrics.errorTasksCount}`, '', `# HELP web_crawl_metrics_last_updated Timestamp of last metrics update`, `# TYPE web_crawl_metrics_last_updated gauge`, `web_crawl_metrics_last_updated{time_range="${timeRange}h"} ${Date.now()}`].join('\n');

      logger.debug('Prometheus metrics generated', { timeRange });
      return prometheusMetrics;
    } catch (error) {
      logger.error('Failed to generate Prometheus metrics', {
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
     }
   }
   ```

### Phase 7: API Layer Implementation

#### 7.1 Create Unified REST Router

```typescript
// api/rest/rest.router.ts
import { Router, Request, Response } from 'express';
import { IHealthCheckService } from '../../common/health/health-check.interface';
import { WebCrawlMetricsService } from '../../application/metrics/services/WebCrawlMetricsService';
import { logger } from '../../common/utils/logger';

/**
 * Unified REST API Router
 *
 * Provides all REST endpoints in a single router:
 * - Health checks: /health, /health/ready, /health/live
 * - Metrics: /metrics, /metrics/json
 * - Easy to extend with new endpoints
 */
export function createRestRouter(healthCheckService: IHealthCheckService, metricsService?: WebCrawlMetricsService): Router {
  const router = Router();

  // Request logging middleware
  router.use((req, res, next) => {
    logger.debug('REST API request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // ===== HEALTH ENDPOINTS =====

  /**
   * GET /health
   * Basic health check endpoint
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      logger.debug('Health check endpoint called');
      const health = await healthCheckService.getSystemHealth();

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        version: health.version,
        uptime: health.uptime,
        checks: {
          database: {
            status: health.checks.database.status,
            responseTime: health.checks.database.responseTime,
          },
          kafka: {
            status: health.checks.kafka.status,
            responseTime: health.checks.kafka.responseTime,
          },
          service: {
            status: health.checks.service.status,
            responseTime: health.checks.service.responseTime,
          },
        },
      });
    } catch (error) {
      logger.error('Health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  /**
   * GET /health/ready
   * Readiness probe endpoint for Kubernetes
   */
  router.get('/health/ready', async (req: Request, res: Response) => {
    try {
      logger.debug('Readiness probe endpoint called');
      const health = await healthCheckService.getSystemHealth();

      const isReady = health.checks.database.status === 'up' && health.checks.kafka.status === 'up' && health.checks.service.status === 'up';

      const statusCode = isReady ? 200 : 503;

      res.status(statusCode).json({
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
          database: health.checks.database.status,
          kafka: health.checks.kafka.status,
          service: health.checks.service.status,
        },
      });
    } catch (error) {
      logger.error('Readiness probe endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      });
    }
  });

  /**
   * GET /health/live
   * Liveness probe endpoint for Kubernetes
   */
  router.get('/health/live', async (req: Request, res: Response) => {
    try {
      logger.debug('Liveness probe endpoint called');
      const serviceHealth = await healthCheckService.checkServiceHealth();

      const isAlive = serviceHealth.status === 'up';
      const statusCode = isAlive ? 200 : 503;

      res.status(statusCode).json({
        alive: isAlive,
        timestamp: new Date().toISOString(),
        uptime: serviceHealth.details?.uptime,
      });
    } catch (error) {
      logger.error('Liveness probe endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      });
    }
  });

  // ===== METRICS ENDPOINTS =====

  /**
   * GET /metrics
   * Prometheus format metrics endpoint
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      logger.debug('Prometheus metrics endpoint called');

      if (!metricsService) {
        res.status(503).json({
          error: 'Metrics service not available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const hoursBack = req.query.hours ? parseInt(req.query.hours as string) : undefined;
      const prometheusMetrics = await metricsService.getPrometheusMetrics(hoursBack);

      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).send(prometheusMetrics);
    } catch (error) {
      logger.error('Prometheus metrics endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).send('# Error generating metrics\n');
    }
  });

  /**
   * GET /metrics/json
   * JSON format metrics endpoint
   */
  router.get('/metrics/json', async (req: Request, res: Response) => {
    try {
      logger.debug('JSON metrics endpoint called');

      if (!metricsService) {
        res.status(503).json({
          error: 'Metrics service not available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const hoursBack = req.query.hours ? parseInt(req.query.hours as string) : undefined;
      const metrics = await metricsService.getAllMetrics(hoursBack);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.status(200).json({
        timestamp: new Date().toISOString(),
        timeRange: hoursBack ? `${hoursBack}h` : 'default',
        metrics: {
          newTasksCount: metrics.newTasksCount,
          completedTasksCount: metrics.completedTasksCount,
          errorTasksCount: metrics.errorTasksCount,
        },
        lastUpdated: metrics.lastUpdated,
      });
    } catch (error) {
      logger.error('JSON metrics endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        error: 'Metrics retrieval failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ===== ERROR HANDLING =====

  // Error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
    logger.error('REST API error', {
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  router.use('*', (req, res) => {
    logger.debug('REST API 404', { method: req.method, path: req.path });

    res.status(404).json({
      error: 'Endpoint not found',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  });

  return router;
}
```

### Phase 8: Update Composition Root

#### 8.1 Update Application Factory

   ```typescript
// application/services/application.factory.ts (update)
import { WebCrawlMetricsService } from '../metrics/services/WebCrawlMetricsService';
import { IWebCrawlMetricsDataPort } from '../metrics/ports/IWebCrawlMetricsDataPort';
import { metricsConfig } from '../../config/metrics';

export class ApplicationFactory {
  // ... existing methods ...

  static createWebCrawlMetricsService(metricsDataPort: IWebCrawlMetricsDataPort): WebCrawlMetricsService {
    return new WebCrawlMetricsService(metricsDataPort, metricsConfig);
     }
   }
   ```

#### 8.2 Update App.ts

```typescript
// app.ts (update relevant parts)
import { WebCrawlMetricsService } from './application/metrics/services/WebCrawlMetricsService';
import { WebCrawlMetricsAdapter } from './infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter';
import { createRestRouter } from './api/rest/rest.router';
import { metricsConfig } from './config/metrics';

export class TaskManagerApp {
  // ... existing code ...

  async start(): Promise<void> {
    try {
      // ... existing initialization code ...

      // Initialize infrastructure layer
      const webCrawlTaskRepository = this.postgresFactory.createWebCrawlTaskRepository();
      const webCrawlMetricsAdapter = new WebCrawlMetricsAdapter(this.postgresFactory.getPool());
      logger.debug('Infrastructure adapters created');

      // Initialize application layer
      const webCrawlTaskManager = ApplicationFactory.createWebCrawlTaskManager(webCrawlTaskRepository);
      const webCrawlMetricsService = ApplicationFactory.createWebCrawlMetricsService(webCrawlMetricsAdapter);
      logger.debug('Application services created');

      // Initialize API layer
      const restRouter = createRestRouter(this.postgresFactory.getHealthCheckService(), webCrawlMetricsService);
      logger.debug('REST router created');

      // ... rest of existing code ...
    } catch (error) {
      // ... existing error handling ...
    }
  }

  // ... rest of existing code ...
}
```

## Files to Create/Modify

### New Files

- `src/config/metrics.ts`
- `src/domain/types/metrics.types.ts`
- `src/application/metrics/ports/IWebCrawlMetricsDataPort.ts`
- `src/application/metrics/services/WebCrawlMetricsService.ts`
- `src/application/metrics/index.ts`
- `src/infrastructure/persistence/postgres/schema/08-metrics-functions.sql`
- `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts`

### Files to Modify

- `deployment/observability/docker-compose.yml` (Grafana plugin fix)
- `deployment/observability/configs/grafana/provisioning/datasources/datasources.yml`
- `src/app.ts` (dependency injection)
- `src/api/rest/rest.router.ts` (unified router)
- `src/application/services/application.factory.ts` (add metrics service factory)

### Files to Remove

- `src/common/metrics/enhanced-metrics.service.ts`
- `src/common/metrics/business-metrics.service.ts`
- `src/common/metrics/metrics.service.ts`
- `src/common/metrics/metrics.interface.ts`
- `src/common/metrics/metrics.types.ts`
- `src/api/rest/metrics.router.ts`
- `src/api/rest/health-check.router.ts`

## Testing Strategy

1. **Grafana Plugin Test**

   - Verify Jaeger datasource appears in Grafana
   - Test trace visualization

2. **SQL Functions Test**

   - Test all SQL functions with different time ranges
   - Verify performance and accuracy
   - Test edge cases (0 hours, very large hours)

3. **Infrastructure Layer Test**

   - Test WebCrawlMetricsAdapter with database
   - Test SQL function calls
   - Test error handling
   - Test port implementation

4. **Application Layer Test**

   - Test WebCrawlMetricsService with mock data port
   - Test error handling and logging
   - Test configurable time ranges
   - Test business logic

5. **API Layer Test**

   - Test unified REST router
   - Test all endpoints (/health, /metrics, /metrics/json)
   - Test query parameters for time ranges
   - Test error responses

6. **End-to-End Test**

   - End-to-end flow: Database → Adapter → Service → Router
   - Test with different time ranges
   - Test Prometheus format output
   - Test JSON format output

## Success Criteria

- [ ] Grafana Jaeger plugin installs successfully
- [ ] Jaeger traces visible in Grafana
- [ ] Metrics logic moved to application layer with proper ports
- [ ] SQL functions for metrics extraction working
- [ ] Configurable time ranges working (via query params and config)
- [ ] Web-crawl metrics service implemented in application layer
- [ ] Clear separation between all layers with proper port boundaries
- [ ] Unified REST router implemented
- [ ] All existing metrics functionality preserved
- [ ] Performance improved with database functions
- [ ] Proper error handling and logging throughout
- [ ] Easy to extend with new metrics by following the pattern
- [ ] Application layer only accesses infrastructure layer through ports

## Extension Pattern

To add new metrics in the future:

1. **Add SQL function** in infrastructure layer
2. **Add port method** in application port
3. **Add adapter method** in infrastructure adapter
4. **Add service method** in application service
5. **Add API endpoint** in unified router
6. **Update composition root** to wire up new service

Example:

```typescript
// 1. SQL function
CREATE OR REPLACE FUNCTION get_custom_metric(p_hours_back INTEGER DEFAULT 24)
RETURNS INTEGER AS $$ ... $$ LANGUAGE plpgsql;

// 2. Application port method
export interface IWebCrawlMetricsDataPort {
  getCustomMetric(hoursBack: number): Promise<number>;
}

// 3. Infrastructure adapter method
async getCustomMetric(hoursBack: number): Promise<number> {
  // Implementation
}

// 4. Application service method
async getCustomMetric(hoursBack?: number): Promise<number> {
  // Implementation
}

// 5. API endpoint
router.get('/metrics/custom', async (req, res) => {
  const hoursBack = req.query.hours ? parseInt(req.query.hours as string) : undefined;
  const metric = await metricsService.getCustomMetric(hoursBack);
  res.json({ customMetric: metric });
});
```

## Notes

- This refactor maintains backward compatibility
- Time ranges configurable via query parameters and config defaults
- Metrics extraction uses SQL functions for performance
- Application layer only accesses infrastructure layer through ports
- Application layer contains business logic with proper ports
- Infrastructure layer implements ports via adapters
- API layer directly uses application services
- Clean port-based architecture with clear boundaries
- Easy to extend with new metrics by following the pattern
- Proper error handling and logging throughout all layers
- SQL functions optimized for performance and reusability
- No direct access between layers - all communication through ports

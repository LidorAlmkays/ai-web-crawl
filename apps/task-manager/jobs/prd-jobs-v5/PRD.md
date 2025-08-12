# Product Requirements Document (PRD) v5

## Task Manager Observability Simplification

### Overview

This PRD updates the observability scope to simplify metrics to the essentials and prepare for traces next. We will:

- Keep metrics minimal: web-crawl business metrics only (new, completed, error)
- Provide health checks
- Expose them from a single REST router
- Make metric time windows configurable via config (not fixed 24h)
- Enforce clean layering: API uses application services; application uses infra via ports; infra uses SQL functions (no raw SQL)
- Use OTEL Collector to extract metrics (not direct Prometheus binding)

### Objectives

- Reduce metrics scope and complexity
- Centralize REST endpoints (single router)
- Make metrics time window configurable
- Maintain clean layered architecture
- Use OTEL Collector for metrics extraction
- Prepare for future trace work

### Scope

- Metrics: web-crawl counts over configurable time range
- Health: service, database, kafka status endpoints
- REST: one router that exposes both
- Config: `metrics.defaultTimeRangeHours`, `metrics.availableTimeRanges`
- OTEL: Collector scrapes `/metrics` and forwards to Prometheus

### Architecture

- API Layer: Single `rest.router.ts` for health and metrics; no API ports
- Application Layer: `WebCrawlMetricsService` implements business logic; depends on `IWebCrawlMetricsDataPort`
- Infrastructure Layer: `WebCrawlMetricsAdapter` implements `IWebCrawlMetricsDataPort` using SQL functions
- Domain Layer: Defines `WebCrawlMetrics` type
- Config Layer: `metrics.ts` defines defaults and ranges
- OTEL Layer: Collector scrapes `/metrics` endpoint and forwards to Prometheus

### Data Flow

```
Task Manager (/metrics) → OTEL Collector → Prometheus → Grafana
```

### Success Criteria

1. Single REST router with `/health`, `/health/ready`, `/health/live`, `/metrics`, `/metrics/json`
2. Metrics time range configurable via config and overridable via `?hours=` query param
3. Application layer only depends on infra via `IWebCrawlMetricsDataPort`
4. Infra uses SQL functions for counts (no raw inline SQL logic)
5. OTEL Collector scrapes `/metrics` endpoint
6. Old metrics router removed
7. Tests/linters pass

### Out of Scope

- Direct Prometheus configuration
- Advanced system metrics/exporters
- Multi-format business dashboards
- Tracing (will be addressed next)

### Dependencies

- PostgreSQL functions for counts by status and hours back
- Express for REST
- OTEL Collector for metrics extraction

### Timeline

- Job 19: Metrics architecture refactor (this doc) – 0.5 day
- Job 12: Metrics testing (update to simplified flow) – 0.5 day
- Job 18: OTEL metrics integration (update to reflect OTEL scraping) – 0.5 day
- Next: Traces PRD/jobs after metrics complete

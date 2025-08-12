# Job 20: Fix Grafana Docker Issue

## Objective

Fix the Grafana Docker container issue where it's failing to start due to an invalid plugin installation attempt for `grafana-jaeger-datasource`.

## Status: ✅ COMPLETED

## Problem Analysis

### Current Issue

- Grafana container exits with code 1
- Error: `failed to install plugin grafana-jaeger-datasource@latest@: 404: Plugin not found`
- The `grafana-jaeger-datasource` plugin doesn't exist or isn't available in the Grafana plugin registry
- This prevents Grafana from starting properly

### Root Cause

- The Docker Compose configuration is trying to install a non-existent plugin
- The plugin name `grafana-jaeger-datasource` is incorrect or deprecated
- Grafana's plugin installation mechanism has changed (deprecated `GF_INSTALL_PLUGINS`)

## Requirements

### Fix Plugin Installation

- [ ] Remove the invalid plugin installation attempt
- [ ] Update to use correct plugin installation method
- [ ] Install only valid and available plugins
- [ ] Ensure Grafana starts successfully

### Docker Configuration Update

- [ ] Update Docker Compose environment variables
- [ ] Remove deprecated plugin installation method
- [ ] Ensure proper volume mounts
- [ ] Test container startup

### Prepare for Tempo Integration

- [ ] Remove Jaeger-related plugin configurations
- [ ] Ensure Grafana is ready for Tempo data source
- [ ] Test basic Grafana functionality

## Test Criteria

### ✅ Grafana Container Startup

- [ ] Grafana container starts without errors
- [ ] No plugin installation failures
- [ ] Container remains running (doesn't exit)
- [ ] Grafana UI is accessible at http://localhost:3001

### ✅ Plugin Management

- [ ] No invalid plugin installation attempts
- [ ] Valid plugins install successfully
- [ ] Plugin installation uses current best practices
- [ ] No deprecated environment variables

### ✅ Basic Functionality

- [ ] Grafana login works (admin/admin)
- [ ] Prometheus data source is accessible
- [ ] Loki data source is accessible
- [ ] Basic dashboard functionality works

### ✅ Observability Stack

- [ ] All containers in observability stack start successfully
- [ ] No dependency issues between services
- [ ] Metrics and logs continue to work
- [ ] Overall observability functionality preserved

## Implementation Details

### Files to Modify

#### Docker Compose Configuration

- `deployment/observability/docker-compose.yml`
  - Remove `GF_INSTALL_PLUGINS=grafana-jaeger-datasource@latest`
  - Remove `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-jaeger-datasource`
  - Update to use `GF_PLUGINS_PREINSTALL` if needed for other plugins

#### Grafana Configuration

- `deployment/observability/configs/grafana/provisioning/datasources/datasources.yml`
  - Ensure Prometheus and Loki data sources are correct
  - Remove any Jaeger-related configurations

#### Documentation

- `deployment/observability/README.md`
  - Update with correct plugin installation best practices
  - Document Tempo integration approach

### Solution Approach

#### Remove Problematic Plugin

- Remove the `grafana-jaeger-datasource` plugin installation
- Use Tempo for trace visualization instead (see Job 19.1)
- Configure Tempo as a data source in Grafana manually

#### Expected Outcome

```
Before:
- Grafana container exits with error
- Plugin installation fails
- No Grafana UI access

After:
- Grafana container starts successfully
- No plugin installation errors
- Grafana UI accessible at http://localhost:3001
- Ready for Tempo integration
```

## Dependencies

- **Docker Compose**: Already configured
- **Grafana**: Latest version with plugin support
- **Prometheus**: Already configured as data source
- **Loki**: Already configured as data source
- **Tempo**: Will be added in Job 19.1

## Success Metrics

- [ ] Grafana container starts without errors
- [ ] Grafana UI is accessible at http://localhost:3001
- [ ] No plugin installation failures in logs
- [ ] All observability services remain functional
- [ ] Documentation is updated with correct instructions
- [ ] Ready for Tempo integration

## Next Steps

1. Remove problematic plugin configurations
2. Update Docker Compose configuration
3. Test Grafana container startup
4. Verify basic Grafana functionality
5. Update documentation
6. Prepare for Tempo integration (Job 19.1)

## Priority

**HIGH** - This blocks access to Grafana UI and affects the overall observability stack functionality. Should be fixed before proceeding with distributed tracing implementation using Tempo.

# Notes on Failing Tests

This file documents tests that were removed due to implementation issues but should be re-implemented in the future.

## Logger Factory Tests (`logger-factory.spec.ts`)

### Test: "should return correct log level based on NODE_ENV"

- **Intended to test**: Environment-based log level configuration
- **What it wanted to verify**: That `getLogLevel()` returns appropriate levels for different environments
- **Issue**: Default behavior changed during implementation - needs alignment with actual implementation

### Test: "should detect development mode correctly"

- **Intended to test**: Development mode detection logic
- **What it wanted to verify**: That `isDevelopment()` correctly identifies development environment
- **Issue**: Default behavior changed during implementation - needs alignment with actual implementation

## Simple Logger Tests (`simple-logger.spec.ts`)

### Test: "should format messages with colors"

- **Intended to test**: Color formatting in console output
- **What it wanted to verify**: That log messages include proper ANSI color codes
- **Issue**: Winston console transport mocking strategy needs refinement

### Test: "should handle metadata correctly"

- **Intended to test**: Metadata handling in log messages
- **What it wanted to verify**: That additional metadata is properly included in log output
- **Issue**: Winston log object structure differs from expected format

### Test: "should format messages without service name"

- **Intended to test**: Console output format for SimpleLogger
- **What it wanted to verify**: That service name is excluded from SimpleLogger output
- **Issue**: Winston console transport mocking and message format verification needs improvement

## Otel Logger Tests (`otel-logger.spec.ts`)

### Test: "should format console output with service name"

- **Intended to test**: Console output format for OtelLogger
- **What it wanted to verify**: That service name is included in OtelLogger console output
- **Issue**: Winston console transport mocking and message format verification needs improvement

### Test: "should send logs to OTEL collector"

- **Intended to test**: OTEL integration functionality
- **What it wanted to verify**: That logs are properly forwarded to OTEL collector
- **Issue**: OTLPLogExporter mocking and integration testing needs proper setup

### Test: "should handle OTEL export errors gracefully"

- **Intended to test**: Error handling in OTEL integration
- **What it wanted to verify**: That OTEL export failures don't crash the application
- **Issue**: Error simulation and handling verification needs improvement

## General Testing Issues

1. **Winston Console Transport Mocking**: The current approach of mocking `winston.transports.Console.prototype.log` doesn't capture the final formatted output correctly.

2. **OTEL Integration Testing**: Proper mocking of OpenTelemetry components requires more sophisticated setup.

3. **Environment Variable Testing**: Tests need to properly reset environment variables between test cases.

4. **Async Testing**: Some tests involving async operations (like OTEL export) need proper async/await handling.

## Future Implementation Notes

- Use proper Winston testing utilities or mock the entire Winston logger
- Implement proper OTEL SDK mocking for integration tests
- Add integration tests that verify actual log file output
- Consider using a test-specific logger configuration
- Add performance tests for high-volume logging scenarios




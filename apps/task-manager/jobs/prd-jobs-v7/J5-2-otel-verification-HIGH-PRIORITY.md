# Job 5.2: OTEL Collector Verification - CRITICAL TEST

## Overview

**Status**: 🔄 **READY TO START**  
**Priority**: 2 (HIGHEST - MOST IMPORTANT CHECK)  
**Duration**: 45 minutes  
**Description**: **VERIFY LOGS ACTUALLY REACH OTEL COLLECTOR** - This is the most critical validation to ensure our OTEL logger system is working end-to-end in production.

## Why This Is The Most Important Check

The user specifically emphasized this as priority #2: **"the most important check is that otel collector is really receiving the logs that we produce"**

### The Problem We're Solving

- We can send logs to OTEL endpoints, but are they actually being received?
- OTEL could be silently failing or misconfigured
- Circuit breaker needs real failure scenarios to validate
- Production reliability depends on confirmed OTEL integration

### Success Criteria

- ✅ Logs demonstrably reach OTEL collector
- ✅ Log format and metadata preserved in transmission
- ✅ Service name and timestamps correctly transmitted
- ✅ Circuit breaker behavior verified under failure conditions

## Approach: Minimal OTEL Collector Changes

**Preference**: Verify without modifying OTEL collector  
**Fallback**: Minimal file export addition if needed

### Method 1: Check Existing OTEL Collector Logs (Preferred)

```bash
# Check if OTEL collector is receiving logs via its own logs
docker logs <otel-collector-container> --follow
```

### Method 2: Temporary File Export (If Method 1 Insufficient)

```yaml
# Minimal addition to existing OTEL collector config
exporters:
  file:
    path: ./logs/verification-logs.json
    format: json
```

## Detailed Tasks

### Task 5.2.1: Examine Current OTEL Setup (10 minutes)

**Objective**: Understand current OTEL collector configuration and logging

```bash
# Check current OTEL collector setup
cd deployment/observability
docker-compose ps
docker logs <otel-collector-container> --tail 50

# Examine current OTEL collector configuration
cat configs/otel-collector-config.yaml
```

**Key Questions**:

- Is OTEL collector running and healthy?
- What endpoints are configured? (4317 GRPC, 4318 HTTP)
- What exporters are currently configured? (Loki, Prometheus, etc.)
- Are there any error messages in collector logs?

### Task 5.2.2: Create OTEL Verification Script (15 minutes)

**File**: `apps/task-manager/scripts/verify-otel-logs.js`

```javascript
const { initializeLogger, logger } = require('../dist/common/utils/logger');

async function verifyOTELLogs() {
  console.log('🧪 OTEL Log Verification Test Starting...\n');

  // Initialize logger with OTEL enabled
  await initializeLogger();

  // Send unique test logs with identifiable content
  const testId = `OTEL_VERIFY_${Date.now()}`;

  console.log(`📡 Sending test logs with ID: ${testId}`);

  // Send test logs at all levels
  logger.info(`${testId}_INFO: OTEL verification test message`, {
    testType: 'verification',
    testId: testId,
    timestamp: new Date().toISOString(),
    level: 'info',
  });

  logger.warn(`${testId}_WARN: OTEL verification warning`, {
    testType: 'verification',
    testId: testId,
    level: 'warn',
  });

  logger.error(`${testId}_ERROR: OTEL verification error`, {
    testType: 'verification',
    testId: testId,
    level: 'error',
  });

  logger.debug(`${testId}_DEBUG: OTEL verification debug`, {
    testType: 'verification',
    testId: testId,
    level: 'debug',
  });

  logger.success(`${testId}_SUCCESS: OTEL verification success`, {
    testType: 'verification',
    testId: testId,
    level: 'success',
  });

  console.log('\n⏳ Waiting 10 seconds for logs to reach OTEL collector...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log(`\n🔍 Now check OTEL collector logs for messages containing: ${testId}`);
  console.log('💡 Instructions:');
  console.log('   1. Check OTEL collector container logs');
  console.log('   2. Look for Loki/other exporter confirmations');
  console.log('   3. Verify all 5 test messages were processed');

  return testId;
}

// Run verification
verifyOTELLogs()
  .then((testId) => {
    console.log(`\n✅ Verification script completed. Test ID: ${testId}`);
    console.log('📋 Check OTEL collector logs to confirm message receipt');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
```

### Task 5.2.3: Execute OTEL Verification Test (10 minutes)

```bash
# Ensure OTEL collector is running
cd deployment/observability
docker-compose up -d

# Build the task-manager project
cd ../../apps/task-manager
npm run build

# Run OTEL verification script
node scripts/verify-otel-logs.js

# In parallel terminal - monitor OTEL collector logs
docker logs <otel-collector-container> --follow | grep -i "OTEL_VERIFY"
```

### Task 5.2.4: Analyze Results and Document Findings (10 minutes)

**Success Indicators**:

- ✅ OTEL collector logs show received log entries
- ✅ Test ID appears in collector processing logs
- ✅ All 5 log levels (info, warn, error, debug, success) processed
- ✅ Metadata preserved in transmission
- ✅ No circuit breaker activation during test

**Failure Indicators**:

- ❌ No test messages appear in OTEL collector logs
- ❌ OTEL collector shows connection errors
- ❌ Circuit breaker opens due to OTEL failures
- ❌ Logs appear in console but not in OTEL processing

## Fallback: Temporary File Export (If Needed)

**Only if collector logs are insufficient for verification**

### Add File Exporter to OTEL Config

```yaml
# Add to deployment/observability/configs/otel-collector-config.yaml
exporters:
  file:
    path: /logs/otel-verification.json
    format: json
  # ... existing exporters

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [file, otlphttp/loki] # Add file to existing exporters
```

### Verification Script Update

```javascript
// After sending test logs, check file output
const fs = require('fs');
const logFile = '../../../logs/otel-verification.json';

if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.trim().split('\n');
  const matchingLogs = lines.filter((line) => line.includes(testId));

  console.log(`📄 Found ${matchingLogs.length}/5 test logs in OTEL output file`);
  return matchingLogs.length === 5;
} else {
  console.log('❌ OTEL output file not found');
  return false;
}
```

## Circuit Breaker Validation

### Test OTEL Failure Scenario

```javascript
// Temporarily configure invalid OTEL endpoint
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://invalid-endpoint:9999';

// Send logs and verify circuit breaker opens
for (let i = 0; i < 10; i++) {
  logger.info(`Circuit breaker test ${i}`);
}

// Check circuit breaker state
// (This requires access to circuit breaker instance - may need logger factory modification)
```

## Expected Results

### ✅ Success Scenario

```
🧪 OTEL Log Verification Test Starting...

📡 Sending test logs with ID: OTEL_VERIFY_1734567890123
⏳ Waiting 10 seconds for logs to reach OTEL collector...

OTEL Collector Logs:
2024-01-01T12:00:00Z [INFO] Received log: OTEL_VERIFY_1734567890123_INFO
2024-01-01T12:00:00Z [WARN] Received log: OTEL_VERIFY_1734567890123_WARN
2024-01-01T12:00:00Z [ERROR] Received log: OTEL_VERIFY_1734567890123_ERROR
2024-01-01T12:00:00Z [DEBUG] Received log: OTEL_VERIFY_1734567890123_DEBUG
2024-01-01T12:00:00Z [INFO] Received log: OTEL_VERIFY_1734567890123_SUCCESS

✅ All 5 test logs confirmed received by OTEL collector
📡 OTEL integration working correctly
```

### ❌ Failure Scenario

```
❌ No test messages found in OTEL collector logs
🔧 Possible issues:
  • OTEL collector not running
  • Network connectivity issues
  • OTEL endpoint misconfigured
  • Circuit breaker preventing transmission
```

## Deliverables

1. **Verification Script**: `scripts/verify-otel-logs.js`
2. **Test Results**: Documentation of successful log transmission
3. **OTEL Status**: Confirmation collector is receiving and processing logs
4. **Circuit Breaker Validation**: Behavior under failure conditions
5. **Troubleshooting Guide**: Steps to diagnose OTEL issues

## Success Criteria

- [ ] **Test logs confirmed reaching OTEL collector**
- [ ] **All log levels (info, warn, error, debug, success) transmitted**
- [ ] **Metadata and service name preserved**
- [ ] **Circuit breaker behavior validated**
- [ ] **Performance remains <1ms per log call**
- [ ] **Reproducible verification process documented**

## Impact on Production Readiness

This verification ensures:

- **182 logger calls** will successfully transmit to OTEL in production
- **26 critical error logs** will reach observability infrastructure
- **Circuit breaker** will protect against OTEL outages
- **Monitoring setup** will receive application logs for debugging

## Next Steps After Completion

- If ✅ **SUCCESSFUL**: Proceed to unit tests and performance validation
- If ❌ **FAILED**: Debug OTEL configuration and network connectivity before continuing
- **Document findings** for production deployment procedures

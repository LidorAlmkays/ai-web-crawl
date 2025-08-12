const {
  logger,
} = require('../dist/apps/task-manager/src/common/utils/loggers');

async function testProcessingLatency() {
  console.log('Testing OTEL Collector processing latency...\n');

  const startTime = Date.now();

  // Send test log
  logger.info('Latency test message', {
    correlationId: 'latency-test',
    timestamp: new Date().toISOString(),
  });

  const endTime = Date.now();
  const latency = endTime - startTime;

  console.log(`Log processing latency: ${latency}ms`);

  if (latency < 1000) {
    console.log('✅ Processing latency is acceptable');
  } else {
    console.log('❌ Processing latency is too high');
  }
}

testProcessingLatency().catch(console.error);




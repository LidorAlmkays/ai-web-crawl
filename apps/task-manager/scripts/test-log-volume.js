const {
  logger,
} = require('../dist/apps/task-manager/src/common/utils/loggers');

async function testLogVolume() {
  console.log('Testing OTEL Collector with high log volume...\n');

  // Send 100 logs rapidly
  for (let i = 0; i < 100; i++) {
    logger.info(`Volume test message ${i}`, {
      correlationId: `test-${i}`,
      taskId: `task-${i}`,
      userEmail: `test${i}@example.com`,
    });

    // Small delay to avoid overwhelming
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log('Log volume test completed');
}

testLogVolume().catch(console.error);




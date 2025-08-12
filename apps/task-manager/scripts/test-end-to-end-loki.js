const {
  logger,
} = require('../dist/apps/task-manager/src/common/utils/loggers');

async function testEndToEndLoki() {
  console.log('Testing end-to-end log flow to Loki...\n');

  // Send test logs via OTEL logger
  logger.info('End-to-end test message 1', {
    correlationId: 'e2e-test-1',
    taskId: 'task-e2e-1',
    userEmail: 'test@example.com',
  });

  logger.error('End-to-end test message 2', {
    correlationId: 'e2e-test-2',
    taskId: 'task-e2e-2',
    errorCode: 'TEST_ERROR',
  });

  console.log('✅ Test logs sent via OTEL logger');
  console.log('Check Loki for these logs...');
}

testEndToEndLoki().catch(console.error);




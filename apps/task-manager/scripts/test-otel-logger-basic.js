const {
  logger,
} = require('../dist/apps/task-manager/src/common/utils/loggers');

async function testOtelLoggerBasic() {
  console.log('Testing OTEL Logger basic functionality...\n');

  // Test different log levels
  logger.info('Test info message from OTEL logger');
  logger.error('Test error message from OTEL logger');
  logger.debug('Test debug message from OTEL logger');
  logger.warn('Test warning message from OTEL logger');

  // Test with metadata
  logger.info('Test message with metadata', {
    correlationId: 'test-123',
    taskId: 'task-456',
    userEmail: 'test@example.com',
  });

  console.log('OTEL Logger basic test completed');
}

testOtelLoggerBasic().catch(console.error);

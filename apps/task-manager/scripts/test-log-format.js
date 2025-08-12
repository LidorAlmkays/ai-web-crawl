const { logger } = require('../src/common/utils/loggers');

async function testLogFormat() {
  console.log('Testing log format and structure...\n');

  // Test with various metadata combinations
  logger.info('Test message with full metadata', {
    correlationId: 'test-123',
    taskId: 'task-456',
    userEmail: 'test@example.com',
    processingStage: 'TEST',
    errorCategory: 'NONE',
    serviceName: 'task-manager',
  });

  // Test error format
  logger.error('Test error with context', {
    correlationId: 'test-456',
    taskId: 'task-789',
    errorCode: 'TEST_ERROR',
    errorDetails: 'Test error details',
    processingStage: 'ERROR_TEST',
    severity: 'HIGH',
  });

  // Test with correlation ID
  const correlationId = `test-${Date.now()}`;
  logger.info('Test message 1', { correlationId });
  logger.debug('Test message 2', { correlationId });
  logger.warn('Test message 3', { correlationId });
  logger.error('Test message 4', { correlationId });

  console.log(`Correlation ID used: ${correlationId}`);
  console.log('Log format test completed');
}

testLogFormat().catch(console.error);




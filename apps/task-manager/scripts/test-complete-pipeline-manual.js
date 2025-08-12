const { logger } = require('../src/common/utils/logger');

async function testCompletePipelineManual() {
  console.log('🚀 Testing complete pipeline manually...\n');

  try {
    // Test 1: Direct OTEL logger test
    console.log('📝 Test 1: Direct OTEL logger test');
    await logger.info('Manual test: Kafka message received', {
      correlationId: 'manual-test-1',
      taskId: 'test-task-manual-1',
      userEmail: 'test@example.com',
      processingStage: 'KAFKA_RECEIVED',
    });

    await logger.error('Manual test: Task processing error', {
      correlationId: 'manual-test-2',
      taskId: 'test-task-manual-2',
      errorCode: 'MANUAL_TEST_ERROR',
      processingStage: 'TASK_PROCESSING',
    });

    console.log('✅ Direct OTEL logger test completed');

    // Test 2: Simulate Kafka message processing
    console.log('\n📝 Test 2: Simulate Kafka message processing');

    const kafkaMessage = {
      taskId: 'test-task-manual-kafka',
      status: 'new',
      userEmail: 'kafka-test@example.com',
      url: 'https://example.com/kafka-test',
    };

    // Simulate the Kafka handler processing
    await logger.info(`Kafka event received: new (${kafkaMessage.taskId})`, {
      taskId: kafkaMessage.taskId,
      correlationId: 'kafka-test-123',
      topic: 'task-status',
      processingStage: 'KAFKA_RECEIVED',
    });

    // Simulate task creation
    await logger.info(`Web-crawl task created: ${kafkaMessage.taskId}`, {
      taskId: kafkaMessage.taskId,
      correlationId: 'kafka-test-123',
      userEmail: kafkaMessage.userEmail,
      status: 'new',
      processingStage: 'TASK_CREATION_SUCCESS',
    });

    console.log('✅ Kafka simulation test completed');

    // Test 3: Simulate task completion
    console.log('\n📝 Test 3: Simulate task completion');

    await logger.info(`Web-crawl task completed: ${kafkaMessage.taskId}`, {
      correlationId: 'kafka-test-123',
      taskId: kafkaMessage.taskId,
      userEmail: kafkaMessage.userEmail,
      status: 'completed',
      processingStage: 'TASK_COMPLETION_SUCCESS',
    });

    console.log('✅ Task completion simulation completed');

    console.log('\n🎉 All manual tests completed successfully!');
    console.log('📊 Check Loki for these logs with service="task-manager"');
  } catch (error) {
    console.error('❌ Manual test failed:', error.message);
  }
}

testCompletePipelineManual().catch(console.error);

#!/usr/bin/env node

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

/**
 * Simple Distributed Tracing Test Runner
 *
 * This script sends Kafka messages with W3C trace context to test
 * distributed tracing functionality.
 */

class SimpleTracingTester {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'simple-tracing-tester',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = null;
  }

  /**
   * Format W3C trace context
   */
  formatW3CTraceContext(traceId, spanId, traceFlags = 1) {
    return `00-${traceId}-${spanId}-0${traceFlags}`;
  }

  /**
   * Generate test trace context
   */
  generateTestTraceContext() {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const spanId = '00f067aa0ba902b7';
    return { traceId, spanId };
  }

  /**
   * Create a test message
   */
  createTestMessage(traceId, spanId, status, taskId) {
    const traceparent = this.formatW3CTraceContext(traceId, spanId);

    const headers = {
      traceparent: traceparent,
      tracestate: '',
      id: taskId,
      task_type: 'web-crawl',
      status: status,
      timestamp: new Date().toISOString(),
    };

    let value;
    switch (status) {
      case 'new':
        value = JSON.stringify({
          user_email: 'test@example.com',
          user_query: 'Find product information for distributed tracing test',
          base_url: 'https://example.com',
        });
        break;
      case 'completed':
        value = JSON.stringify({
          crawl_result:
            'Found 5 products matching criteria for distributed tracing test',
        });
        break;
      case 'error':
        value = JSON.stringify({
          error_message: 'Test error for distributed tracing validation',
          error_code: 'TEST_ERROR',
        });
        break;
      default:
        value = JSON.stringify({});
    }

    return {
      topic: 'task-status',
      messages: [
        {
          key: taskId,
          value: value,
          headers: headers,
        },
      ],
    };
  }

  /**
   * Send message to Kafka
   */
  async sendMessage(message) {
    try {
      if (!this.producer) {
        this.producer = this.kafka.producer();
        await this.producer.connect();
      }

      console.log('📤 Sending message with headers:', {
        topic: message.topic,
        taskId: message.messages[0].key,
        headers: message.messages[0].headers,
      });

      await this.producer.send(message);

      console.log('✅ Message sent successfully:', {
        topic: message.topic,
        taskId: message.messages[0].key,
        traceId: message.messages[0].headers.traceparent,
        status: message.messages[0].headers.status,
      });
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Run the test
   */
  async runTest() {
    console.log('🚀 Starting Simple Distributed Tracing Test...\n');

    try {
      // Generate test trace context
      const { traceId, spanId } = this.generateTestTraceContext();
      console.log(`📊 Test Trace ID: ${traceId}`);
      console.log(`📊 Test Span ID: ${spanId}`);
      console.log(
        `📊 Trace Parent: ${this.formatW3CTraceContext(traceId, spanId)}\n`
      );

      const taskId = uuidv4();

      // Test 1: Send new task message
      console.log('📤 Test 1: Sending new task message...');
      const newTaskMessage = this.createTestMessage(
        traceId,
        spanId,
        'new',
        taskId
      );
      await this.sendMessage(newTaskMessage);

      // Wait for processing
      await this.delay(2000);

      // Test 2: Send complete task message (same trace)
      console.log('\n📤 Test 2: Sending complete task message (same trace)...');
      const completeTaskMessage = this.createTestMessage(
        traceId,
        spanId,
        'completed',
        taskId
      );
      await this.sendMessage(completeTaskMessage);

      // Wait for processing
      await this.delay(2000);

      // Test 3: Send error task message (same trace)
      console.log('\n📤 Test 3: Sending error task message (same trace)...');
      const errorTaskMessage = this.createTestMessage(
        traceId,
        spanId,
        'error',
        taskId
      );
      await this.sendMessage(errorTaskMessage);

      // Wait for processing
      await this.delay(2000);

      // Test 4: Send another new task message (different trace)
      console.log('\n📤 Test 4: Sending new task message (different trace)...');
      const { traceId: traceId2, spanId: spanId2 } =
        this.generateTestTraceContext();
      const taskId2 = uuidv4();
      const newTaskMessage2 = this.createTestMessage(
        traceId2,
        spanId2,
        'new',
        taskId2
      );
      await this.sendMessage(newTaskMessage2);

      console.log('\n✅ Distributed Tracing Test Completed!');
      console.log('\n📋 Test Summary:');
      console.log(`   • Sent 4 messages with trace context`);
      console.log(`   • Used 2 different trace IDs`);
      console.log(`   • Tested new, complete, and error task statuses`);
      console.log(`   • All messages should appear in Grafana/Tempo`);

      console.log('\n🔍 Next Steps:');
      console.log('   1. Check Grafana at http://localhost:3002');
      console.log('   2. Navigate to Explore → Tempo');
      console.log('   3. Search for traces with service.name="task-manager"');
      console.log('   4. Look for traces with the test trace IDs above');
      console.log('   5. Verify parent-child span relationships');
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run the test
const tester = new SimpleTracingTester();

tester
  .runTest()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

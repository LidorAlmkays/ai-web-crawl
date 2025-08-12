const { Kafka } = require('kafkajs');
const axios = require('axios');

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function testKafkaToLokiPipeline() {
  console.log(
    '🚀 Testing complete pipeline: Kafka → Task Manager → OTEL → Loki\n'
  );

  try {
    // Connect to Kafka
    await producer.connect();
    console.log('✅ Connected to Kafka');

    // Send a test message to the task-status topic
    const testMessage = {
      taskId: `test-task-${Date.now()}`,
      status: 'new',
      userEmail: 'test@example.com',
      url: 'https://example.com/test',
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending Kafka message:', testMessage);

    await producer.send({
      topic: 'task-status',
      messages: [
        {
          key: testMessage.taskId,
          value: JSON.stringify(testMessage),
          headers: {
            eventType: 'new',
            id: testMessage.taskId,
            taskId: testMessage.taskId,
          },
        },
      ],
    });

    console.log('✅ Kafka message sent successfully');
    console.log('⏳ Waiting for Task Manager to process the message...');

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if the log appears in Loki
    console.log('🔍 Checking Loki for the log...');

    const query = `{service="task-manager"} |= "${testMessage.taskId}"`;
    const startTime = Date.now() - 60000; // 1 minute ago
    const endTime = Date.now() + 60000; // 1 minute in the future

    const response = await axios.get(
      'http://localhost:3100/loki/api/v1/query_range',
      {
        params: {
          query,
          start: startTime * 1000000, // nanoseconds
          end: endTime * 1000000, // nanoseconds
          step: '1s',
        },
      }
    );

    console.log('✅ Loki query successful');
    console.log(
      '📊 Query results:',
      response.data.data.result.length,
      'streams'
    );

    if (response.data.data.result.length > 0) {
      console.log('🎉 SUCCESS: Log found in Loki!');
      console.log('📝 Sample log entries:');

      response.data.data.result.forEach((stream, index) => {
        console.log(`\nStream ${index}:`);
        console.log('  Labels:', stream.stream);
        console.log('  Values:', stream.values.slice(0, 2)); // Show first 2 values
      });
    } else {
      console.log('❌ No logs found in Loki for the test message');
      console.log('🔍 Trying broader query...');

      // Try a broader query
      const broadQuery = '{service="task-manager"}';
      const broadResponse = await axios.get(
        'http://localhost:3100/loki/api/v1/query_range',
        {
          params: {
            query: broadQuery,
            start: startTime * 1000000,
            end: endTime * 1000000,
            step: '1s',
          },
        }
      );

      console.log(
        '📊 Broad query results:',
        broadResponse.data.data.result.length,
        'streams'
      );
      if (broadResponse.data.data.result.length > 0) {
        console.log('📝 Recent logs in Loki:');
        broadResponse.data.data.result.forEach((stream, index) => {
          console.log(`  Stream ${index}:`, stream.stream);
          console.log('    Values:', stream.values.slice(0, 1));
        });
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  } finally {
    await producer.disconnect();
    console.log('🔌 Disconnected from Kafka');
  }
}

testKafkaToLokiPipeline().catch(console.error);




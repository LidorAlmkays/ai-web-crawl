const axios = require('axios');

async function testLokiIngestion() {
  console.log('Testing Loki log ingestion...\n');

  const logs = [];
  for (let i = 0; i < 50; i++) {
    // Increased to 50 logs
    // Use nanoseconds timestamp as string, with slight variation
    const timestamp = ((Date.now() + i) * 1000000).toString();
    logs.push([
      timestamp,
      `Volume test log message ${i} from Task Manager with correlation ID test-${i}`,
    ]);
  }

  const payload = {
    streams: [
      {
        stream: {
          service: 'task-manager',
          level: 'info',
          test: 'volume',
          component: 'volume-test',
        },
        values: logs,
      },
    ],
  };

  try {
    console.log(`Sending ${logs.length} logs to Loki...`);

    const response = await axios.post(
      'http://localhost:3100/loki/api/v1/push',
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('✅ Loki ingestion test successful');
    console.log('Response status:', response.status);
    console.log(`Successfully ingested ${logs.length} logs`);
    return true;
  } catch (error) {
    console.error('❌ Loki ingestion test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

testLokiIngestion();

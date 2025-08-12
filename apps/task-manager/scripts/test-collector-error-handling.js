const axios = require('axios');

async function testCollectorErrorHandling() {
  console.log('Testing OTEL Collector error handling...\n');

  try {
    // Test with malformed OTLP data
    const malformedData = {
      resourceLogs: [
        {
          resource: {},
          scopeLogs: [
            {
              scope: {},
              logRecords: [
                {
                  // Missing required fields
                  body: 'Malformed log message',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await axios.post(
      'http://localhost:4318/v1/logs',
      malformedData,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('✅ Collector handled malformed data gracefully');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Collector correctly rejected malformed data');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

testCollectorErrorHandling();




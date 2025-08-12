const axios = require('axios');

async function testCollectorConnectivity() {
  console.log('Testing OTEL Collector connectivity...\n');

  try {
    // Test collector health endpoint
    const healthResponse = await axios.get('http://localhost:9464/metrics');
    console.log('✅ OTEL Collector is accessible');

    // Test OTLP HTTP endpoint
    const otlpResponse = await axios.post(
      'http://localhost:4318/v1/logs',
      {
        resourceLogs: [
          {
            resource: {
              attributes: [
                {
                  key: 'service.name',
                  value: { stringValue: 'task-manager' },
                },
              ],
            },
            scopeLogs: [
              {
                scope: {},
                logRecords: [
                  {
                    timeUnixNano: Date.now() * 1000000,
                    severityText: 'INFO',
                    severityNumber: 9,
                    body: { stringValue: 'Connectivity test message' },
                    attributes: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ OTLP HTTP endpoint test successful');
    console.log('✅ Logs sent to collector successfully');
    return true;
  } catch (error) {
    console.error('❌ Collector connectivity test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

testCollectorConnectivity();

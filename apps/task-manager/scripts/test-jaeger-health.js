const axios = require('axios');

async function testJaegerHealth() {
  try {
    // Test Jaeger health endpoint
    const healthResponse = await axios.get(
      'http://localhost:16686/api/services'
    );
    console.log('✅ Jaeger health check passed');
    console.log('Available services:', healthResponse.data.data);

    // Test Jaeger search endpoint
    const searchResponse = await axios.get(
      'http://localhost:16686/api/traces',
      {
        params: {
          service: 'task-manager',
          limit: 10,
        },
      }
    );

    console.log('✅ Jaeger search successful');
    console.log('Traces found:', searchResponse.data.data.length);

    return true;
  } catch (error) {
    console.error('❌ Jaeger health check failed:', error.message);
    return false;
  }
}

testJaegerHealth();




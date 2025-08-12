const axios = require('axios');

async function testCollectorHealth() {
  try {
    // Test collector metrics endpoint
    const metricsResponse = await axios.get('http://localhost:8888/metrics');
    console.log('✅ Collector metrics endpoint accessible');

    // Test collector health endpoint
    const healthResponse = await axios.get('http://localhost:8888/');
    console.log('✅ Collector health endpoint accessible');

    return true;
  } catch (error) {
    console.error('❌ Collector health check failed:', error.message);
    return false;
  }
}

testCollectorHealth();




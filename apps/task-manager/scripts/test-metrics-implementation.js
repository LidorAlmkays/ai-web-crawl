const axios = require('axios');

/**
 * Test script for metrics implementation
 * Tests the metrics endpoints and business metrics functionality
 */
async function testMetricsImplementation() {
  console.log('🚀 Testing Metrics Implementation...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // Test 1: Health endpoint
    console.log('📝 Test 1: Metrics Health Check');
    const healthResponse = await axios.get(`${baseUrl}/metrics/health`);
    console.log('✅ Health check successful');
    console.log('Status:', healthResponse.data.status);
    console.log('Uptime:', healthResponse.data.uptime);
    console.log(
      'Business Metrics Enabled:',
      healthResponse.data.metrics.business.enabled
    );
    console.log(
      'System Metrics Enabled:',
      healthResponse.data.metrics.system.enabled
    );

    // Test 2: 24h Statistics endpoint
    console.log('\n📝 Test 2: 24h Statistics');
    const stats24hResponse = await axios.get(`${baseUrl}/metrics/24h`);
    console.log('✅ 24h stats successful');
    console.log('Period:', stats24hResponse.data.period);
    console.log('Stats:', stats24hResponse.data.stats);

    // Test 3: Business Metrics endpoint
    console.log('\n📝 Test 3: Business Metrics');
    const businessResponse = await axios.get(`${baseUrl}/metrics/business`);
    console.log('✅ Business metrics successful');
    console.log('Timestamp:', businessResponse.data.timestamp);
    console.log(
      'Business metrics structure:',
      Object.keys(businessResponse.data.business)
    );

    // Test 4: Prometheus Metrics endpoint
    console.log('\n📝 Test 4: Prometheus Metrics');
    const prometheusResponse = await axios.get(`${baseUrl}/metrics`);
    console.log('✅ Prometheus metrics successful');
    console.log('Content-Type:', prometheusResponse.headers['content-type']);
    console.log('Metrics content length:', prometheusResponse.data.length);

    // Check for specific metrics
    const metricsContent = prometheusResponse.data;
    const hasTaskMetrics = metricsContent.includes(
      'task_manager_tasks_created_total'
    );
    const has24hMetrics = metricsContent.includes(
      'task_manager_tasks_created_24h'
    );
    const hasErrorMetrics = metricsContent.includes(
      'task_manager_errors_total'
    );

    console.log('Has task metrics:', hasTaskMetrics);
    console.log('Has 24h metrics:', has24hMetrics);
    console.log('Has error metrics:', hasErrorMetrics);

    // Test 5: JSON Metrics endpoint
    console.log('\n📝 Test 5: JSON Metrics');
    const jsonResponse = await axios.get(`${baseUrl}/metrics/json`);
    console.log('✅ JSON metrics successful');
    console.log('Timestamp:', jsonResponse.data.timestamp);
    console.log('Uptime:', jsonResponse.data.uptime);
    console.log('Business metrics available:', !!jsonResponse.data.business);
    console.log('System metrics available:', !!jsonResponse.data.system);

    // Test 6: System Metrics endpoint
    console.log('\n📝 Test 6: System Metrics');
    const systemResponse = await axios.get(`${baseUrl}/metrics/system`);
    console.log('✅ System metrics successful');
    console.log('Timestamp:', systemResponse.data.timestamp);
    console.log(
      'System metrics structure:',
      Object.keys(systemResponse.data.system)
    );

    console.log('\n🎉 All metrics tests completed successfully!');
    console.log('\n📊 Metrics Summary:');
    console.log('- Health endpoint: ✅ Working');
    console.log('- 24h statistics: ✅ Working');
    console.log('- Business metrics: ✅ Working');
    console.log('- Prometheus format: ✅ Working');
    console.log('- JSON format: ✅ Working');
    console.log('- System metrics: ✅ Working');

    return true;
  } catch (error) {
    console.error('❌ Metrics test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testMetricsImplementation().catch(console.error);




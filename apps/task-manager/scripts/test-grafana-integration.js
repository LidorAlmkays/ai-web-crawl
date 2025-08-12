const axios = require('axios');

async function testGrafanaIntegration() {
  try {
    // Test Grafana health
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Grafana health check passed');

    // Test data sources
    const datasourcesResponse = await axios.get(
      'http://localhost:3001/api/datasources'
    );
    console.log('✅ Grafana data sources accessible');
    console.log('Data sources found:', datasourcesResponse.data.length);

    for (const ds of datasourcesResponse.data) {
      console.log(`- ${ds.name} (${ds.type}): ${ds.url}`);
    }

    // Test dashboards
    const dashboardsResponse = await axios.get(
      'http://localhost:3001/api/search'
    );
    console.log('✅ Grafana dashboards accessible');
    console.log('Dashboards found:', dashboardsResponse.data.length);

    for (const dashboard of dashboardsResponse.data) {
      console.log(`- ${dashboard.title} (${dashboard.type})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Grafana integration test failed:', error.message);
    return false;
  }
}

testGrafanaIntegration();




const axios = require('axios');

async function testCompleteStack() {
  const services = [
    { name: 'OTEL Collector', url: 'http://localhost:9464/metrics' },
    { name: 'Loki', url: 'http://localhost:3100/ready' },
    { name: 'Prometheus', url: 'http://localhost:9090/-/healthy' },
    { name: 'Jaeger', url: 'http://localhost:16686/api/services' },
    { name: 'Grafana', url: 'http://localhost:3001/api/health' },
  ];

  console.log('Testing complete observability stack...\n');

  for (const service of services) {
    try {
      await axios.get(service.url);
      console.log(`✅ ${service.name} is healthy`);
    } catch (error) {
      console.log(`❌ ${service.name} is not healthy: ${error.message}`);
    }
  }
}

testCompleteStack();




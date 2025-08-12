#!/usr/bin/env node

/**
 * Test script to verify metrics endpoints work correctly
 * Run with: node scripts/test-metrics-endpoints.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;

    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);

    const req = http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Content-Type: ${res.headers['content-type']}`);

        if (res.statusCode === 200) {
          console.log(`   ✅ Success: ${description}`);
          if (data.length < 200) {
            console.log(`   Response: ${data}`);
          } else {
            console.log(
              `   Response: ${data.substring(0, 200)}... (truncated)`
            );
          }
          resolve({ status: res.statusCode, data });
        } else {
          console.log(`   ❌ Error: ${description}`);
          console.log(`   Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Network Error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🚀 Starting Metrics Endpoints Test');
  console.log('=====================================');

  const tests = [
    {
      path: '/api/metrics/config',
      description: 'Metrics Configuration Endpoint',
    },
    {
      path: '/api/metrics/json',
      description: 'JSON Metrics Endpoint (default time range)',
    },
    {
      path: '/api/metrics/json?hours=12',
      description: 'JSON Metrics Endpoint (12 hours)',
    },
    {
      path: '/api/metrics',
      description: 'Prometheus Metrics Endpoint',
    },
    {
      path: '/api/metrics?hours=6',
      description: 'Prometheus Metrics Endpoint (6 hours)',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await testEndpoint(test.path, test.description);
      passed++;
    } catch (error) {
      failed++;
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed > 0) {
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Make sure the server is running: nx serve task-manager');
    console.log('2. Check if the database schema is applied (see below)');
    console.log('3. Verify database connection and metrics functions exist');
    console.log('\n🔧 Database Setup:');
    console.log(
      '   The error "function get_new_tasks_count(unknown) does not exist"'
    );
    console.log('   indicates the database schema needs to be applied.');
    console.log('   Run the main schema file: 00-main.sql');
  } else {
    console.log(
      '\n🎉 All tests passed! Metrics endpoints are working correctly.'
    );
  }
}

// Run the tests
runTests().catch(console.error);

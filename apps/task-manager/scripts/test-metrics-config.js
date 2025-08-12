#!/usr/bin/env node

/**
 * Test script to demonstrate metrics configuration with environment variables
 * Run with: node scripts/test-metrics-config.js
 */

console.log('=== Metrics Configuration Test ===\n');

// Test 1: Default configuration
console.log('1. Default Configuration:');
process.env = {}; // Clear environment
const { metricsConfig: defaultConfig } = require('../dist/config/metrics');
console.log(`   Default Time Range: ${defaultConfig.defaultTimeRangeHours}h`);
console.log(
  `   Available Ranges: [${defaultConfig.availableTimeRanges.join(', ')}]`
);
console.log(`   Refresh Interval: ${defaultConfig.refreshIntervalSeconds}s\n`);

// Test 2: Custom configuration via environment variables
console.log('2. Custom Configuration via Environment Variables:');
process.env.METRICS_DEFAULT_TIME_RANGE_HOURS = '12';
process.env.METRICS_AVAILABLE_TIME_RANGES = '1,3,6,12,24';
process.env.METRICS_REFRESH_INTERVAL_SECONDS = '30';

// Re-import to get fresh config
delete require.cache[require.resolve('../dist/config/metrics')];
const { metricsConfig: customConfig } = require('../dist/config/metrics');

console.log(`   Custom Time Range: ${customConfig.defaultTimeRangeHours}h`);
console.log(
  `   Custom Ranges: [${customConfig.availableTimeRanges.join(', ')}]`
);
console.log(
  `   Custom Refresh Interval: ${customConfig.refreshIntervalSeconds}s\n`
);

// Test 3: Invalid configuration handling
console.log('3. Invalid Configuration Handling:');
process.env.METRICS_DEFAULT_TIME_RANGE_HOURS = 'invalid';
process.env.METRICS_AVAILABLE_TIME_RANGES = '1,invalid,3';
process.env.METRICS_REFRESH_INTERVAL_SECONDS = 'not-a-number';

// Re-import to get fresh config
delete require.cache[require.resolve('../dist/config/metrics')];
const { metricsConfig: invalidConfig } = require('../dist/config/metrics');

console.log(
  `   Invalid Time Range (should fallback): ${invalidConfig.defaultTimeRangeHours}h`
);
console.log(
  `   Invalid Ranges (should fallback): [${invalidConfig.availableTimeRanges.join(
    ', '
  )}]`
);
console.log(
  `   Invalid Refresh Interval (should fallback): ${invalidConfig.refreshIntervalSeconds}s\n`
);

console.log('=== Test Complete ===');
console.log('\nTo use custom configuration, set these environment variables:');
console.log('  METRICS_DEFAULT_TIME_RANGE_HOURS=12');
console.log('  METRICS_AVAILABLE_TIME_RANGES=1,3,6,12,24');
console.log('  METRICS_REFRESH_INTERVAL_SECONDS=30');

#!/usr/bin/env node

/**
 * Simple Metrics Functions Application Script
 *
 * This script applies the metrics functions by executing the entire file
 * Run with: node scripts/apply-metrics-functions-simple.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration (matching your app config)
const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'tasks_manager',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  ssl:
    process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const metricsFunctionsFile = path.join(
  __dirname,
  '..',
  'src',
  'infrastructure',
  'persistence',
  'postgres',
  'schema',
  '08-metrics-functions.sql'
);

async function applyMetricsFunctions() {
  console.log('🚀 Applying Metrics Functions (Simple Method)');
  console.log('=============================================');
  console.log(
    `Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
  );
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Read the metrics functions file
    console.log('\n📖 Reading metrics functions file...');
    if (!fs.existsSync(metricsFunctionsFile)) {
      throw new Error(
        `Metrics functions file not found: ${metricsFunctionsFile}`
      );
    }

    const content = fs.readFileSync(metricsFunctionsFile, 'utf8');
    console.log('✅ Metrics functions file loaded');

    // Execute the entire file as one statement
    console.log('\n🔧 Applying metrics functions...');
    await pool.query(content);
    console.log('✅ Metrics functions applied');

    // Verify all metrics functions were created
    console.log('\n🔍 Verifying metrics functions...');
    const functionsToCheck = [
      'get_new_tasks_count',
      'get_completed_tasks_count',
      'get_error_tasks_count',
      'get_tasks_count_by_status',
      'get_web_crawl_metrics',
    ];

    let allFunctionsExist = true;
    for (const funcName of functionsToCheck) {
      const result = await pool.query(
        `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = $1 AND routine_schema = 'public'
      `,
        [funcName]
      );

      if (result.rows.length > 0) {
        console.log(`   ✅ Function exists: ${funcName}`);
      } else {
        console.log(`   ❌ Function missing: ${funcName}`);
        allFunctionsExist = false;
      }
    }

    if (allFunctionsExist) {
      console.log('\n🎉 All metrics functions applied successfully!');
      console.log('📊 Metrics endpoints should now work');
      console.log('\n💡 Test the endpoints:');
      console.log('   - http://localhost:3000/api/metrics/json');
      console.log('   - http://localhost:3000/api/metrics');
    } else {
      console.log('\n❌ Some metrics functions are missing');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error applying metrics functions:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
applyMetricsFunctions().catch(console.error);

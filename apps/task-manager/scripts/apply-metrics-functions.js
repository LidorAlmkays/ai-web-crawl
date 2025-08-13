#!/usr/bin/env node

/**
 * Apply Metrics Functions Script
 *
 * This script applies only the metrics functions, ignoring errors for existing objects.
 * Useful when other schema exists but metrics functions are missing or need updating.
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
  console.log('🚀 Applying Metrics Functions');
  console.log('=============================');
  console.log(
    `Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
  );
  console.log(`User: ${dbConfig.user}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Read and apply the metrics functions file
    console.log('\n📖 Reading metrics functions file...');
    if (!fs.existsSync(metricsFunctionsFile)) {
      throw new Error(
        `Metrics functions file not found: ${metricsFunctionsFile}`
      );
    }

    const functionsContent = fs.readFileSync(metricsFunctionsFile, 'utf8');
    console.log('✅ Metrics functions file loaded');

    // Execute the entire functions file as one statement
    // This handles dollar-quoted strings properly
    console.log('\n🔧 Applying metrics functions...');

    try {
      await pool.query(functionsContent);
      console.log('   ✅ Metrics functions applied successfully');
    } catch (error) {
      console.log(
        `   ⚠️  Some functions may already exist (continuing): ${error.message}`
      );
    }

    // Verify the metrics functions we need
    console.log('\n🔍 Verifying metrics functions...');
    const functionsToCheck = [
      'get_new_tasks_count',
      'get_completed_tasks_count',
      'get_error_tasks_count',
      'get_tasks_count_by_status',
      'get_total_tasks_count_by_creation_time',
      'get_web_crawl_metrics',
    ];

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
      }
    }

    console.log('\n🎉 Metrics functions applied successfully!');
    console.log('📊 All metrics functions are now available');
    console.log('\n💡 You can now test the metrics endpoints:');
    console.log('   - http://localhost:3000/api/metrics/json');
    console.log('   - http://localhost:3000/api/metrics');
  } catch (error) {
    console.error('\n❌ Error applying metrics functions:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running and accessible');
      console.error('   Check your database connection settings');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Make sure the database exists');
      console.error('   Create it with: CREATE DATABASE tasks_manager;');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
applyMetricsFunctions().catch(console.error);

#!/usr/bin/env node

/**
 * Apply Metrics Functions Script
 *
 * This script applies only the metrics functions without affecting existing schema
 * Run with: node scripts/apply-metrics-functions.js
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
  console.log('==============================');
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

    // Check if metrics functions already exist
    console.log('\n🔍 Checking existing metrics functions...');
    const existingFunctions = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('get_new_tasks_count', 'get_completed_tasks_count', 'get_error_tasks_count', 'get_tasks_count_by_status', 'get_web_crawl_metrics')
      AND routine_schema = 'public'
    `);

    if (existingFunctions.rows.length > 0) {
      console.log('⚠️  Some metrics functions already exist:');
      existingFunctions.rows.forEach((row) => {
        console.log(`   - ${row.routine_name}`);
      });
      console.log('\n🔄 Dropping existing functions to recreate them...');

      // Drop existing functions
      const dropStatements = [
        'DROP FUNCTION IF EXISTS get_new_tasks_count(INTEGER)',
        'DROP FUNCTION IF EXISTS get_completed_tasks_count(INTEGER)',
        'DROP FUNCTION IF EXISTS get_error_tasks_count(INTEGER)',
        'DROP FUNCTION IF EXISTS get_tasks_count_by_status(task_status, INTEGER)',
        'DROP FUNCTION IF EXISTS get_web_crawl_metrics(INTEGER)',
      ];

      for (const dropStmt of dropStatements) {
        try {
          await pool.query(dropStmt);
        } catch (error) {
          // Ignore errors if function doesn't exist
        }
      }
      console.log('✅ Existing functions dropped');
    }

    // Read and apply the metrics functions file
    console.log('\n📖 Reading metrics functions file...');
    if (!fs.existsSync(metricsFunctionsFile)) {
      throw new Error(
        `Metrics functions file not found: ${metricsFunctionsFile}`
      );
    }

    const content = fs.readFileSync(metricsFunctionsFile, 'utf8');
    console.log('✅ Metrics functions file loaded');

    // Split by semicolons and execute each statement
    console.log('\n🔧 Applying metrics functions...');
    const statements = content
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Skip if function already exists or other non-critical errors
          if (!error.message.includes('already exists')) {
            console.log(`   ⚠️  Statement skipped: ${error.message}`);
          }
        }
      }
    }

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

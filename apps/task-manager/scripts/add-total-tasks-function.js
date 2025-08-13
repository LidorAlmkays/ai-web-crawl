#!/usr/bin/env node

/**
 * Add Total Tasks Count Function Script
 *
 * This script adds just the missing get_total_tasks_count_by_creation_time function.
 */

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

async function addTotalTasksFunction() {
  console.log('🚀 Adding Total Tasks Count Function');
  console.log('====================================');
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

    // Add the new function
    console.log(
      '\n🔧 Adding get_total_tasks_count_by_creation_time function...'
    );

    const functionSQL = `
      -- Function to get total tasks count created within given hours
      CREATE OR REPLACE FUNCTION get_total_tasks_count_by_creation_time(hours INTEGER)
      RETURNS INTEGER AS $$
      BEGIN
        RETURN (
          SELECT COUNT(*)::INTEGER
          FROM web_crawl_tasks
          WHERE created_at >= NOW() - INTERVAL '1 hour' * hours
        );
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      await pool.query(functionSQL);
      console.log(
        '   ✅ Function get_total_tasks_count_by_creation_time added successfully'
      );
    } catch (error) {
      console.log(`   ⚠️  Function creation failed: ${error.message}`);
    }

    // Verify the function exists
    console.log('\n🔍 Verifying function...');
    const result = await pool.query(
      `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'get_total_tasks_count_by_creation_time' AND routine_schema = 'public'
    `
    );

    if (result.rows.length > 0) {
      console.log(
        '   ✅ Function get_total_tasks_count_by_creation_time exists'
      );
    } else {
      console.log(
        '   ❌ Function get_total_tasks_count_by_creation_time is missing'
      );
    }

    // Test the function
    console.log('\n🧪 Testing function...');
    try {
      const testResult = await pool.query(
        'SELECT get_total_tasks_count_by_creation_time(24) as count'
      );
      console.log(
        `   ✅ Function test successful: ${testResult.rows[0].count} tasks in last 24 hours`
      );
    } catch (error) {
      console.log(`   ❌ Function test failed: ${error.message}`);
    }

    console.log('\n🎉 Total tasks count function added successfully!');
  } catch (error) {
    console.error('\n❌ Error adding function:');
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
addTotalTasksFunction().catch(console.error);

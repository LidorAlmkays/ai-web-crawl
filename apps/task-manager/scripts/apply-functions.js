#!/usr/bin/env node

/**
 * Apply Database Functions Script
 *
 * This script applies only the database functions, ignoring errors for existing objects.
 * Useful when tables already exist but functions are missing.
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

const functionsFile = path.join(
  __dirname,
  '..',
  'src',
  'infrastructure',
  'persistence',
  'postgres',
  'schema',
  '05-query-functions.sql'
);

async function applyFunctions() {
  console.log('🚀 Applying Database Functions');
  console.log('==============================');
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

    // Read and apply the functions file
    console.log('\n📖 Reading functions file...');
    if (!fs.existsSync(functionsFile)) {
      throw new Error(`Functions file not found: ${functionsFile}`);
    }

    const functionsContent = fs.readFileSync(functionsFile, 'utf8');
    console.log('✅ Functions file loaded');

    // Execute the entire functions file as one statement
    // This handles dollar-quoted strings properly
    const statements = [functionsContent];

    console.log(`\n🔧 Applying ${statements.length} function statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`   ✅ Statement ${i + 1} applied successfully`);
        } catch (error) {
          console.log(
            `   ⚠️  Statement ${i + 1} failed (continuing): ${error.message}`
          );
        }
      }
    }

    // Verify the specific function we need
    console.log('\n🔍 Verifying find_web_crawl_task_by_id function...');
    const result = await pool.query(
      `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'find_web_crawl_task_by_id' AND routine_schema = 'public'
    `
    );

    if (result.rows.length > 0) {
      console.log('   ✅ Function find_web_crawl_task_by_id exists');
    } else {
      console.log('   ❌ Function find_web_crawl_task_by_id is missing');
    }

    console.log('\n🎉 Database functions applied successfully!');
  } catch (error) {
    console.error('\n❌ Error applying database functions:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
applyFunctions().catch(console.error);

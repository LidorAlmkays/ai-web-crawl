#!/usr/bin/env node

/**
 * Database Schema Application Script
 *
 * This script applies the complete database schema including:
 * - Enums, tables, triggers, stored procedures, functions, views, and metrics functions
 *
 * Run with: node scripts/apply-database-schema.js
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

const schemaDir = path.join(
  __dirname,
  '..',
  'src',
  'infrastructure',
  'persistence',
  'postgres',
  'schema'
);
const mainSchemaFile = path.join(schemaDir, '00-main.sql');

async function applySchema() {
  console.log('🚀 Starting Database Schema Application');
  console.log('========================================');
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

    // Read and apply the main schema file
    console.log('\n📖 Reading main schema file...');
    if (!fs.existsSync(mainSchemaFile)) {
      throw new Error(`Main schema file not found: ${mainSchemaFile}`);
    }

    const mainSchemaContent = fs.readFileSync(mainSchemaFile, 'utf8');
    console.log('✅ Main schema file loaded');

    // Split the content by \i commands and process each file
    const lines = mainSchemaContent.split('\n');
    const schemaFiles = [];

    for (const line of lines) {
      const match = line.match(/\\i\s+(\S+)/);
      if (match) {
        const fileName = match[1];
        const filePath = path.join(schemaDir, fileName);
        schemaFiles.push({ fileName, filePath });
      }
    }

    console.log(`\n📋 Found ${schemaFiles.length} schema files to apply:`);
    schemaFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName}`);
    });

    // Apply each schema file
    console.log('\n🔧 Applying schema files...');
    for (const file of schemaFiles) {
      try {
        console.log(`\n   📄 Applying: ${file.fileName}`);

        if (!fs.existsSync(file.filePath)) {
          throw new Error(`Schema file not found: ${file.filePath}`);
        }

        const content = fs.readFileSync(file.filePath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = content
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            await pool.query(statement);
          }
        }

        console.log(`   ✅ Applied: ${file.fileName}`);
      } catch (error) {
        console.log(`   ❌ Failed to apply ${file.fileName}: ${error.message}`);
        throw error;
      }
    }

    // Verify metrics functions were created
    console.log('\n🔍 Verifying metrics functions...');
    const functionsToCheck = [
      'get_new_tasks_count',
      'get_completed_tasks_count',
      'get_error_tasks_count',
      'get_tasks_count_by_status',
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

    console.log('\n🎉 Database schema applied successfully!');
    console.log('📊 Metrics functions are now available');
    console.log('\n💡 You can now test the metrics endpoints:');
    console.log('   - http://localhost:3000/api/metrics/json');
    console.log('   - http://localhost:3000/api/metrics');
  } catch (error) {
    console.error('\n❌ Error applying database schema:');
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
applySchema().catch(console.error);

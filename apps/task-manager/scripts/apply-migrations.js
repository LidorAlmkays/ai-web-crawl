#!/usr/bin/env node

/**
 * Apply Database Migrations Script
 *
 * Applies SQL files under src/infrastructure/persistence/postgres/migrations in filename order.
 * Run with: node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'tasks_manager',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const migrationsDir = path.join(
  __dirname,
  '..',
  'src',
  'infrastructure',
  'persistence',
  'postgres',
  'migrations'
);

async function applyMigrations() {
  console.log('🚀 Applying Database Migrations');
  console.log('===============================');
  console.log(`Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    if (!fs.existsSync(migrationsDir)) {
      console.log(`ℹ️  No migrations directory found at ${migrationsDir}`);
      return;
    }

    let files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Skip rollback scripts on fresh DBs to avoid ordering issues
    files = files.filter((f) => !f.endsWith('-rollback.sql'));

    if (files.length === 0) {
      console.log('ℹ️  No migration files found.');
      return;
    }

    console.log(`\n📋 Found ${files.length} migrations to apply:`);
    files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

    console.log('\n🔧 Applying migrations...');
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`\n   📄 Applying: ${file}`);
      try {
        await pool.query(sql);
        console.log(`   ✅ Applied: ${file}`);
      } catch (error) {
        console.log(`   ❌ Failed to apply ${file}: ${error.message}`);
        throw error;
      }
    }

    console.log('\n🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('\n❌ Error applying migrations:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigrations().catch(console.error);



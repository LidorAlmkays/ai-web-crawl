#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'tasks_manager',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const schemaDir = path.join(__dirname, '..', 'src', 'infrastructure', 'persistence', 'postgres', 'schema');
const files = ['01-enums.sql', '02-tables.sql', '03-triggers.sql', '04-stored-procedures.sql'];

async function runFile(client, file) {
  const fp = path.join(schemaDir, file);
  const sql = fs.readFileSync(fp, 'utf8');
  // Execute as one statement to keep definitions intact (plpgsql bodies)
  await client.query(sql);
}

(async () => {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  try {
    console.log('Applying core schema files...');
    for (const f of files) {
      process.stdout.write(` - ${f}... `);
      await runFile(client, f);
      console.log('OK');
    }
    console.log('Core schema applied.');
  } catch (e) {
    console.error(`\nFailed: ${e.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();



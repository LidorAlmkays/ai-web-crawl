#!/usr/bin/env node
const { Pool } = require('pg');

const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'tasks_manager',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

(async () => {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  try {
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log('Tables:', tables.rows.map(r => r.table_name));
    const exists = await client.query(
      `SELECT to_regclass('public.web_crawl_tasks') as rel`
    );
    console.log('web_crawl_tasks exists:', !!exists.rows[0].rel);
  } catch (e) {
    console.error('DB check failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();



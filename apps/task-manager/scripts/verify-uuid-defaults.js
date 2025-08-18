#!/usr/bin/env node

/**
 * Verify UUID Defaults and Procedures Script
 *
 * - Checks pgcrypto extension
 * - Verifies default on web_crawl_tasks.id
 * - Inserts without id to confirm UUID default
 * - Calls create_web_crawl_task with NULL id to confirm generation
 */

const { Pool } = require('pg');

const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'tasks_manager',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function main() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying pgcrypto extension...');
    const ext = await client.query(
      "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'"
    );
    console.log(ext.rowCount > 0 ? '   ✅ pgcrypto present' : '   ❌ pgcrypto missing');

    console.log('\n🔍 Verifying default on web_crawl_tasks.id...');
    const def = await client.query(
      `SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='web_crawl_tasks' AND column_name='id'`
    );
    console.log(
      def.rows[0]?.column_default?.includes('gen_random_uuid')
        ? '   ✅ id default uses gen_random_uuid()'
        : `   ❌ id default not set correctly: ${def.rows[0]?.column_default}`
    );

    console.log('\n🧪 Inserting row without id to confirm default...');
    const insert = await client.query(
      `INSERT INTO web_crawl_tasks (user_email, user_query, original_url, received_at, status) VALUES ($1,$2,$3,NOW(),'new') RETURNING id`,
      ['verify@example.com', 'Verify UUID default', 'https://example.com']
    );
    const generatedId = insert.rows[0].id;
    console.log(`   ✅ Inserted row with generated id: ${generatedId}`);

    console.log('\n🧪 Calling create_web_crawl_task with NULL id to confirm procedure generation...');
    await client.query(
      `SELECT create_web_crawl_task(NULL, $1, $2, $3, NOW(), 'new'::task_status, NOW(), NOW())`,
      ['proc@example.com', 'Proc-generated UUID', 'https://example.com/proc']
    );
    const recent = await client.query(
      `SELECT id FROM web_crawl_tasks WHERE user_email = $1 ORDER BY created_at DESC LIMIT 1`,
      ['proc@example.com']
    );
    console.log(
      recent.rowCount === 1
        ? `   ✅ Procedure inserted row with id: ${recent.rows[0].id}`
        : '   ❌ Procedure did not insert expected row'
    );

    console.log('\n🔍 Verifying indexes on id and status...');
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='web_crawl_tasks'`
    );
    const names = idx.rows.map((r) => r.indexname);
    console.log(names.includes('web_crawl_tasks_pkey') || names.some(n=>n.includes('id')) ? '   ✅ PK/ID index present' : '   ❌ Missing id index');
    console.log(names.some((n)=>n.includes('status')) ? '   ✅ Status index present' : '   ❌ Missing status index');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Verification failed:', e.message);
  process.exit(1);
});



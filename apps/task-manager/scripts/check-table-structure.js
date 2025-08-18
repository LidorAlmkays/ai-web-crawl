const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tasks_manager',
  user: 'postgres',
  password: 'password'
});

async function checkTableStructure() {
  try {
    console.log('Checking web_crawl_tasks table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'web_crawl_tasks' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nColumns in web_crawl_tasks:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
    console.log('\nTotal columns:', result.rows.length);
    
  } catch (error) {
    console.error('Error checking table structure:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();

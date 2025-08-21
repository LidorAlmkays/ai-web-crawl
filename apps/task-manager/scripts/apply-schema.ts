import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'tasks_manager',
});

async function applySchema() {
  const client = await pool.connect();
  
  try {
    console.log('Applying database schema...');
    
    // Read and execute each schema file in order
    const schemaFiles = [
      'enums.sql',
      'tables.sql', 
      'triggers.sql',
      'stored-procedures.sql',
      'functions.sql',
      'metrics-functions.sql'
    ];
    
    for (const file of schemaFiles) {
      const filePath = join(__dirname, '../src/infrastructure/persistence/postgres/schema', file);
      console.log(`Applying ${file}...`);
      
      const sql = readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`✅ Applied ${file}`);
    }
    
    console.log('✅ Database schema applied successfully!');
    
  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema().catch(console.error);

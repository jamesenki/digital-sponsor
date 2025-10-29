const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'digital_sponsor_dev',
    user: 'postgres'
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query("SELECT content_text FROM literature_content WHERE content_text ILIKE '%powerless%' LIMIT 1");
    console.log('✅ Query successful!');
    console.log('Found:', result.rows[0]?.content_text?.substring(0, 100) + '...');
    
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
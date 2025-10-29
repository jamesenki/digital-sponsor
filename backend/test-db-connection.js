#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...');
  console.log('================================');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
  });

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const client = await pool.connect();
    console.log('   ✅ Database connection successful');
    
    // Check if tables exist
    console.log('\n2. Checking database schema...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`   📊 Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });
    
    // Check literature tables specifically
    console.log('\n3. Checking literature content...');
    
    try {
      const contentResult = await client.query('SELECT COUNT(*) as total FROM literature_content');
      const sourcesResult = await client.query('SELECT COUNT(*) as total FROM literature_sources WHERE aa_approved = true');
      
      console.log(`   📚 Literature content chunks: ${contentResult.rows[0].total}`);
      console.log(`   📖 AA-approved sources: ${sourcesResult.rows[0].total}`);
      
      if (parseInt(contentResult.rows[0].total) === 0) {
        console.log('   ⚠️  No literature content found - this explains placeholder responses');
      }
      
    } catch (error) {
      console.log(`   ❌ Literature tables don't exist: ${error.message}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🛠️  Troubleshooting steps:');
    console.log('1. Ensure PostgreSQL is running: sudo systemctl status postgresql');
    console.log('2. Check database exists: sudo -u postgres psql -c "\\l"');
    console.log('3. Create database if needed: sudo -u postgres createdb digital_sponsor_dev');
    console.log('4. Check connection string in .env file');
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
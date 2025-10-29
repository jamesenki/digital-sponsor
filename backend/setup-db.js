#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🏗️  Setting up Digital Sponsor Database...');
  console.log('=========================================');
  
  console.log('Environment DATABASE_URL:', process.env.DATABASE_URL);
  
  // Try to connect with different connection strings
  const connectionOptions = [
    process.env.DATABASE_URL?.replace('localhost', '127.0.0.1') || 'postgresql://digital_sponsor:password@127.0.0.1:5432/digital_sponsor_dev',
    process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev'
  ].filter(Boolean);

  let pool = null;
  let connString = null;

  for (const conn of connectionOptions) {
    try {
      console.log(`🔌 Trying connection: ${conn.replace(/\/\/.*@/, '//***@')}`);
      pool = new Pool({ connectionString: conn });
      await pool.query('SELECT 1');
      connString = conn;
      console.log('   ✅ Connection successful!');
      break;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      await pool?.end();
      pool = null;
    }
  }

  if (!pool) {
    console.log('\n❌ Could not connect to PostgreSQL.');
    console.log('\n🛠️  Setup Instructions:');
    console.log('1. Install PostgreSQL: sudo apt-get install postgresql postgresql-contrib');
    console.log('2. Start service: sudo systemctl start postgresql');
    console.log('3. Create user: sudo -u postgres createuser -s enki');
    console.log('4. Create database: createdb digital_sponsor_dev');
    console.log('5. Set password: sudo -u postgres psql -c "ALTER USER enki PASSWORD \'password\';"');
    return;
  }

  try {
    console.log('\n📋 Step 1: Creating database and user...');
    
    // Create database if it doesn't exist
    try {
      await pool.query('CREATE DATABASE digital_sponsor_dev');
      console.log('   ✅ Database created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ Database already exists');
      } else {
        console.log(`   ⚠️  Database creation: ${error.message}`);
      }
    }

    // Create user if needed
    try {
      await pool.query("CREATE USER digital_sponsor WITH PASSWORD 'password'");
      console.log('   ✅ User created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ User already exists');
      } else {
        console.log(`   ⚠️  User creation: ${error.message}`);
      }
    }

    // Grant privileges
    try {
      await pool.query('GRANT ALL PRIVILEGES ON DATABASE digital_sponsor_dev TO digital_sponsor');
      console.log('   ✅ Privileges granted');
    } catch (error) {
      console.log(`   ⚠️  Privileges: ${error.message}`);
    }

    await pool.end();

    // Now connect to the actual database
    console.log('\n📋 Step 2: Setting up schema...');
    const dbPool = new Pool({
      connectionString: connString.replace(/\/postgres$/, '/digital_sponsor_dev')
    });

    // Read and execute SQL schema
    const sqlContent = fs.readFileSync(path.join(__dirname, 'setup-database.sql'), 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('CREATE DATABASE') && !s.startsWith('CREATE USER') && !s.startsWith('GRANT ALL PRIVILEGES ON DATABASE'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await dbPool.query(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`   ⚠️  SQL: ${error.message}`);
          }
        }
      }
    }

    // Verify setup
    const sourcesResult = await dbPool.query('SELECT COUNT(*) as total FROM literature_sources');
    const contentResult = await dbPool.query('SELECT COUNT(*) as total FROM literature_content');
    
    console.log('\n🎉 Database setup complete!');
    console.log(`   📚 Literature sources: ${sourcesResult.rows[0].total}`);
    console.log(`   📖 Content chunks: ${contentResult.rows[0].total}`);
    
    // Test a sample search
    console.log('\n🔍 Testing sample search...');
    const searchResult = await dbPool.query(`
      SELECT content_text, section_title 
      FROM literature_content 
      WHERE to_tsvector('english', content_text) @@ plainto_tsquery('english', 'powerless') 
      LIMIT 1
    `);
    
    if (searchResult.rows.length > 0) {
      console.log('   ✅ Search test successful');
      console.log(`   📝 Found: "${searchResult.rows[0].section_title}"`);
    } else {
      console.log('   ❌ Search test failed');
    }

    await dbPool.end();

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    await pool?.end();
  }
}

setupDatabase();
import { Pool } from 'pg'
import { createClient } from 'redis'

/**
 * Global test setup
 * Initializes test database and Redis connections
 */

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...')
  
  // Test database configuration
  const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'digital_sponsor_test',
    user: process.env.TEST_DB_USER || 'digital_sponsor',
    password: process.env.TEST_DB_PASSWORD || 'password'
  }
  
  try {
    // Create test database if it doesn't exist
    const adminPool = new Pool({
      host: testDbConfig.host,
      port: testDbConfig.port,
      database: 'postgres',
      user: testDbConfig.user,
      password: testDbConfig.password
    })
    
    // Check if test database exists, create if not
    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbConfig.database]
    )
    
    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${testDbConfig.database}`)
      console.log(`✅ Created test database: ${testDbConfig.database}`)
    }
    
    await adminPool.end()
    
    // Initialize test database schema
    const testPool = new Pool({
      connectionString: `postgresql://${testDbConfig.user}:${testDbConfig.password}@${testDbConfig.host}:${testDbConfig.port}/${testDbConfig.database}`
    })
    
    // Create basic schema for tests
    await testPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Create test tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        anonymous BOOLEAN DEFAULT TRUE
      )
    `)
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS literature_sources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(500) NOT NULL,
        category VARCHAR(100) NOT NULL,
        author VARCHAR(200) DEFAULT 'AA World Services',
        published_date DATE,
        copyright_notice TEXT,
        aa_approved BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS literature_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID REFERENCES literature_sources(id) ON DELETE CASCADE,
        section_title VARCHAR(500),
        content_text TEXT NOT NULL,
        page_number INTEGER,
        chapter_number INTEGER,
        chunk_index INTEGER DEFAULT 0,
        word_count INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Insert test data
    const testSource = await testPool.query(`
      INSERT INTO literature_sources (title, category, author, copyright_notice)
      VALUES ('Test Literature', 'test', 'Test Author', 'Test Copyright')
      RETURNING id
    `)
    
    await testPool.query(`
      INSERT INTO literature_content (source_id, section_title, content_text, word_count)
      VALUES ($1, 'Test Section', 'This is test content for search functionality testing.', 10)
    `, [testSource.rows[0].id])
    
    await testPool.end()
    
    console.log('✅ Test database initialized')
    
    // Test Redis connection
    const redisClient = createClient({
      url: process.env.TEST_REDIS_URL || 'redis://localhost:6380',
      password: process.env.TEST_REDIS_PASSWORD || 'password'
    })
    
    await redisClient.connect()
    await redisClient.ping()
    await redisClient.disconnect()
    
    console.log('✅ Test Redis connection verified')
    console.log('🎉 Test environment setup complete')
    
  } catch (error) {
    console.error('❌ Test setup failed:', error)
    throw error
  }
}
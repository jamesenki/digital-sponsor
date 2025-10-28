import { Pool } from 'pg'

/**
 * Global test teardown
 * Cleans up test database and connections
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Clean up test database
    const testDbConfig = {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'digital_sponsor_test',
      user: process.env.TEST_DB_USER || 'digital_sponsor',
      password: process.env.TEST_DB_PASSWORD || 'password'
    }
    
    const testPool = new Pool({
      connectionString: `postgresql://${testDbConfig.user}:${testDbConfig.password}@${testDbConfig.host}:${testDbConfig.port}/${testDbConfig.database}`
    })
    
    // Clear test data
    await testPool.query('TRUNCATE literature_content, literature_sources, anonymous_sessions CASCADE')
    await testPool.end()
    
    console.log('✅ Test database cleaned')
    console.log('🎉 Test environment teardown complete')
    
  } catch (error) {
    console.error('❌ Test teardown failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}
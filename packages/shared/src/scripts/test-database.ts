#!/usr/bin/env node
// Digital Sponsor - Database Test Script
// Tests all database operations and migration functionality

import { DatabaseClient, LiteratureRepository, SessionRepository } from '../utils/database.js';
import { MigrationManager, createMigrationContext, INITIAL_MIGRATIONS } from '../utils/migrations.js';
import { initializeDatabase } from './init-database.js';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  duration: number;
}

class DatabaseTester {
  private dbClient: DatabaseClient;
  private literatureRepo: LiteratureRepository;
  private sessionRepo: SessionRepository;
  private testResults: TestResult[] = [];

  constructor(config: any) {
    this.dbClient = new DatabaseClient(config);
    this.literatureRepo = new LiteratureRepository(config);
    this.sessionRepo = new SessionRepository(config);
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName,
        success: true,
        message: 'PASSED',
        duration
      });
      console.log(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.testResults.push({
        testName,
        success: false,
        message,
        duration
      });
      console.log(`❌ ${testName} (${duration}ms): ${message}`);
    }
  }

  async runAllTests(): Promise<boolean> {
    console.log('🧪 Starting Digital Sponsor Database Tests...\n');

    // Test 1: Database connectivity
    await this.runTest('Database Connectivity', async () => {
      const healthCheck = await this.dbClient.healthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`Health check failed: ${healthCheck.message}`);
      }
    });

    // Test 2: Database metrics
    await this.runTest('Database Metrics', async () => {
      const metrics = await this.dbClient.getMetrics();
      if (!metrics.databaseName) {
        throw new Error('Failed to retrieve database metrics');
      }
      console.log(`   📊 Database: ${metrics.databaseName}, Containers: ${metrics.containerCount}`);
    });

    // Test 3: Literature CRUD operations
    await this.runTest('Literature CRUD Operations', async () => {
      // Create a test literature document
      const testLit = await this.literatureRepo.createLiterature({
        type: 'big_book',
        title: 'Test Chapter - Database Test',
        content: 'This is a test content for database validation.',
        source: {
          publication: 'Test Publication',
          edition: 'Test Edition',
          year: 2025
        },
        structure: {
          book: 'Test Book',
          chapter: 'Test Chapter',
          page: 1
        },
        searchMetadata: {
          keywords: ['test', 'database', 'validation'],
          topics: ['testing']
        },
        classification: {
          content_type: 'instruction',
          reading_level: 'basic',
          sensitivity_level: 'general'
        },
        compliance: {
          traditions_compliant: true,
          anonymity_preserved: true,
          no_endorsements: true,
          educational_only: true
        }
      });

      // Read it back
      const retrieved = await this.dbClient.getById<any>('Literature', testLit.id, testLit.partitionKey);
      if (!retrieved || retrieved.title !== 'Test Chapter - Database Test') {
        throw new Error('Failed to retrieve created literature document');
      }

      // Update it
      const updated = await this.dbClient.update<any>('Literature', testLit.id, testLit.partitionKey, {
        title: 'Test Chapter - Database Test (Updated)'
      });
      if (!updated.title.includes('(Updated)')) {
        throw new Error('Failed to update literature document');
      }

      // Clean up
      await this.dbClient.delete('Literature', testLit.id, testLit.partitionKey);
      console.log(`   📚 Created, read, updated, and deleted test literature document`);
    });

    // Test 4: Session operations
    await this.runTest('Session Operations', async () => {
      const testSession = await this.sessionRepo.createSession({
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
        lastAccessedAt: new Date().toISOString(),
        isActive: true,
        preferences: {
          accessibility: {
            theme: 'light',
            fontSize: 'medium',
            reducedMotion: false,
            screenReader: false,
            focusIndicators: true
          },
          interface: {
            language: 'en',
            notifications: true
          },
          content: {
            preferredLiterature: ['big_book'],
            bookmarks: [],
            reading_progress: {}
          }
        },
        analytics: {
          sessionCount: 1,
          totalTimeSpent: 0,
          featuresUsed: [],
          lastFeature: 'init'
        }
      });

      // Test finding active session
      const activeSession = await this.sessionRepo.getActiveSession('test-user-123');
      if (!activeSession || activeSession.sessionId !== 'test-session-456') {
        throw new Error('Failed to find active session');
      }

      // Test updating last accessed
      await this.sessionRepo.updateLastAccessed(testSession.id, 'test-user-123');

      // Clean up
      await this.dbClient.delete('UserSessions', testSession.id, testSession.partitionKey);
      console.log(`   🔒 Created, found, updated, and deleted test session`);
    });

    // Test 5: Query operations
    await this.runTest('Query Operations', async () => {
      const result = await this.dbClient.query('Literature', 
        'SELECT * FROM c WHERE c.docType = @docType ORDER BY c._ts DESC', 
        ['literature'],
        { maxItemCount: 10 }
      );
      
      if (typeof result.requestCharge !== 'number') {
        throw new Error('Query did not return request charge');
      }
      console.log(`   🔍 Query returned ${result.items.length} items (${result.requestCharge} RU)`);
    });

    // Test 6: Migration system
    await this.runTest('Migration System', async () => {
      const migrationContext = createMigrationContext(
        this.dbClient.client,
        'DigitalSponsor',
        'Migrations',
        () => {} // Silent logger for test
      );
      
      const migrationManager = new MigrationManager(migrationContext);
      
      // Check migration status
      const status = await migrationManager.getMigrationStatus();
      
      if (!Array.isArray(status.completed)) {
        throw new Error('Failed to get migration status');
      }
      
      console.log(`   🔄 Migrations: ${status.completed.length} completed, ${status.pending.length} pending, ${status.failed.length} failed`);
    });

    // Generate test report
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log(`⏱️  Total Time: ${totalDuration}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.message}`));
    }

    return failedTests === 0;
  }
}

// CLI execution
async function main() {
  const options = {
    cosmosEndpoint: process.env.COSMOS_ENDPOINT || '',
    cosmosConnectionString: process.env.COSMOS_CONNECTION_STRING,
    databaseName: process.env.COSMOS_DATABASE_NAME || 'DigitalSponsor',
    verbose: !process.argv.includes('--quiet')
  };

  // For testing, if we have a connection string, we don't need the endpoint
  const dbConfig = options.cosmosConnectionString ? {
    connectionString: options.cosmosConnectionString,
    databaseName: options.databaseName
  } : {
    endpoint: options.cosmosEndpoint,
    databaseName: options.databaseName
  };

  if (!options.cosmosEndpoint && !options.cosmosConnectionString) {
    console.error('Error: COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING environment variable required');
    process.exit(1);
  }

  try {
    // First run database initialization if needed
    if (process.argv.includes('--init')) {
      console.log('🚀 Initializing database first...');
      await initializeDatabase(options);
      console.log('✅ Database initialization completed\n');
    }

    // Run tests
    const tester = new DatabaseTester(dbConfig);
    const allTestsPassed = await tester.runAllTests();

    if (allTestsPassed) {
      console.log('\n🎉 All tests passed! Database is working correctly.');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
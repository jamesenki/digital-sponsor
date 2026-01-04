#!/usr/bin/env node
// Digital Sponsor - Database Initialization Script
// Initializes Cosmos DB with seed data and runs initial migrations

import { DatabaseClient, LiteratureRepository } from '../utils/database.js';
import { MigrationManager, INITIAL_MIGRATIONS, createMigrationContext } from '../utils/migrations.js';
import { LiteratureDocument } from '../types/database.js';

// Emergency resources seed data
const EMERGENCY_RESOURCES = [
  {
    name: 'National Suicide Prevention Lifeline',
    type: 'hotline' as const,
    contact: '988',
    description: '24/7 free and confidential support for people in distress',
    availability: { available24h: true },
    geographic: { region: 'US', country: 'United States', language: 'English' },
    crisis_types: ['suicidal', 'mental_health'] as const,
    verification: { verified: true, lastChecked: new Date().toISOString(), verificationSource: 'Official Government' }
  },
  {
    name: 'Crisis Text Line',
    type: 'text' as const,
    contact: 'Text HOME to 741741',
    description: 'Free 24/7 crisis support via text message',
    availability: { available24h: true },
    geographic: { region: 'US', country: 'United States', language: 'English' },
    crisis_types: ['suicidal', 'substance_abuse', 'mental_health'] as const,
    verification: { verified: true, lastChecked: new Date().toISOString(), verificationSource: 'Crisis Text Line Official' }
  },
  {
    name: 'SAMHSA National Helpline',
    type: 'hotline' as const,
    contact: '1-800-662-HELP (4357)',
    description: 'Treatment referral and information service for substance use disorders',
    availability: { available24h: true },
    geographic: { region: 'US', country: 'United States', language: 'English' },
    crisis_types: ['substance_abuse'] as const,
    verification: { verified: true, lastChecked: new Date().toISOString(), verificationSource: 'SAMHSA Official' }
  },
  {
    name: 'AA World Services',
    type: 'website' as const,
    contact: 'https://www.aa.org/',
    description: 'Official Alcoholics Anonymous website with meeting finder',
    availability: { available24h: true },
    geographic: { region: 'Global', country: 'Global', language: 'Multiple' },
    crisis_types: ['substance_abuse'] as const,
    verification: { verified: true, lastChecked: new Date().toISOString(), verificationSource: 'AA World Services' }
  }
];

// Sample literature content (first few entries from Big Book)
const SAMPLE_LITERATURE: Omit<LiteratureDocument, keyof any>[] = [
  {
    type: 'big_book',
    title: 'Chapter 1: Bill\'s Story',
    content: 'War fever ran high in the New England town to which we new, young officers from Plattsburg were assigned, and we were flattered when the first citizens took us to their homes, making us feel heroic.',
    source: {
      publication: 'Alcoholics Anonymous (The Big Book)',
      edition: '4th Edition',
      year: 2001,
      isbn: '978-1-893007-16-9'
    },
    structure: {
      book: 'Alcoholics Anonymous',
      chapter: 'Bill\'s Story',
      section: 'Chapter 1',
      page: 1
    },
    searchMetadata: {
      keywords: ['bill', 'story', 'beginning', 'founders', 'war', 'drinking'],
      topics: ['personal_story', 'founding', 'early_recovery'],
      step_references: []
    },
    classification: {
      content_type: 'story',
      reading_level: 'intermediate',
      sensitivity_level: 'personal_story'
    },
    compliance: {
      traditions_compliant: true,
      anonymity_preserved: true,
      no_endorsements: true,
      educational_only: true
    }
  },
  {
    type: 'big_book',
    title: 'The Doctor\'s Opinion',
    content: 'We of Alcoholics Anonymous believe that the reader will be interested in the medical estimate of the plan of recovery described in this book.',
    source: {
      publication: 'Alcoholics Anonymous (The Big Book)',
      edition: '4th Edition',
      year: 2001
    },
    structure: {
      book: 'Alcoholics Anonymous',
      chapter: 'The Doctor\'s Opinion',
      page: 23
    },
    searchMetadata: {
      keywords: ['medical', 'doctor', 'disease', 'allergy', 'obsession'],
      topics: ['medical_perspective', 'disease_concept'],
      step_references: []
    },
    classification: {
      content_type: 'instruction',
      reading_level: 'intermediate',
      sensitivity_level: 'general'
    },
    compliance: {
      traditions_compliant: true,
      anonymity_preserved: true,
      no_endorsements: true,
      educational_only: true
    }
  },
  {
    type: 'twelve_and_twelve',
    title: 'Step 1: We admitted we were powerless over alcohol',
    content: 'Who cares to admit complete defeat? Practically no one, of course. Every natural instinct cries out against the idea of personal powerlessness.',
    source: {
      publication: 'Twelve Steps and Twelve Traditions',
      edition: '1st Edition',
      year: 1953
    },
    structure: {
      book: 'Twelve Steps and Twelve Traditions',
      chapter: 'Step One',
      step: 1,
      page: 21
    },
    searchMetadata: {
      keywords: ['powerless', 'defeat', 'admission', 'first_step', 'powerlessness'],
      topics: ['step_work', 'surrender', 'acceptance'],
      step_references: [1],
      tradition_references: []
    },
    classification: {
      content_type: 'instruction',
      reading_level: 'intermediate',
      sensitivity_level: 'general'
    },
    compliance: {
      traditions_compliant: true,
      anonymity_preserved: true,
      no_endorsements: true,
      educational_only: true
    }
  },
  {
    type: 'daily_reflections',
    title: 'January 1st - A New Beginning',
    content: 'And acceptance is the answer to all my problems today.',
    source: {
      publication: 'Daily Reflections',
      edition: '1st Edition',
      year: 1990
    },
    structure: {
      book: 'Daily Reflections',
      section: 'January',
      page: 1
    },
    searchMetadata: {
      keywords: ['acceptance', 'new_beginning', 'problems', 'daily'],
      topics: ['acceptance', 'daily_meditation', 'problems'],
      step_references: [11]
    },
    classification: {
      content_type: 'meditation',
      reading_level: 'basic',
      sensitivity_level: 'general'
    },
    compliance: {
      traditions_compliant: true,
      anonymity_preserved: true,
      no_endorsements: true,
      educational_only: true
    }
  }
];

export interface InitOptions {
  cosmosEndpoint: string;
  cosmosKey?: string;
  cosmosConnectionString?: string;
  databaseName: string;
  skipMigrations?: boolean;
  skipSeedData?: boolean;
  verbose?: boolean;
}

export async function initializeDatabase(options: InitOptions): Promise<void> {
  const logger = options.verbose ? console.log : () => {};
  
  logger('🚀 Starting database initialization...');

  // Create database client
  const dbClient = new DatabaseClient({
    endpoint: options.cosmosEndpoint,
    key: options.cosmosKey,
    connectionString: options.cosmosConnectionString,
    databaseName: options.databaseName
  });

  // Health check
  logger('🔍 Checking database connectivity...');
  const healthCheck = await dbClient.healthCheck();
  if (!healthCheck.healthy) {
    throw new Error(`Database health check failed: ${healthCheck.message}`);
  }
  logger(`✅ Database healthy (${healthCheck.latency}ms)`);

  // Run migrations
  if (!options.skipMigrations) {
    logger('🔄 Running database migrations...');
    
    const migrationContext = createMigrationContext(
      dbClient.client, // Pass the actual cosmos client
      options.databaseName,
      'Migrations',
      logger
    );
    
    const migrationManager = new MigrationManager(migrationContext);
    
    // Register initial migrations
    for (const migration of INITIAL_MIGRATIONS) {
      migrationManager.registerMigration(migration);
    }
    
    const migrationResults = await migrationManager.executePendingMigrations();
    const failedMigrations = migrationResults.filter(r => !r.success);
    
    if (failedMigrations.length > 0) {
      throw new Error(`${failedMigrations.length} migrations failed`);
    }
    
    logger(`✅ ${migrationResults.length} migrations completed successfully`);
  }

  // Seed data
  if (!options.skipSeedData) {
    logger('🌱 Seeding database with initial data...');
    
    // Seed literature content
    const literatureRepo = new LiteratureRepository({
      endpoint: options.cosmosEndpoint,
      key: options.cosmosKey,
      connectionString: options.cosmosConnectionString,
      databaseName: options.databaseName
    });

    logger('📚 Creating literature content...');
    let literatureCount = 0;
    for (const literature of SAMPLE_LITERATURE) {
      try {
        await literatureRepo.createLiterature(literature as any);
        literatureCount++;
      } catch (error) {
        logger(`⚠️  Failed to create literature: ${error}`);
      }
    }
    logger(`✅ Created ${literatureCount} literature documents`);

    // Seed emergency resources
    logger('🆘 Creating emergency resources...');
    let resourceCount = 0;
    for (const resource of EMERGENCY_RESOURCES) {
      try {
        await dbClient.create('CrisisSupport', {
          id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          docType: 'emergency_resource',
          partitionKey: resource.geographic.region,
          ...resource
        });
        resourceCount++;
      } catch (error) {
        logger(`⚠️  Failed to create emergency resource: ${error}`);
      }
    }
    logger(`✅ Created ${resourceCount} emergency resources`);
  }

  // Final health check and metrics
  logger('📊 Getting database metrics...');
  try {
    const metrics = await dbClient.getMetrics();
    logger('✅ Database initialization complete!');
    logger(`📈 Database: ${metrics.databaseName}`);
    logger(`📦 Containers: ${metrics.containerCount}`);
    for (const container of metrics.containers) {
      logger(`   - ${container.name}: ${container.documentCount} documents`);
    }
  } catch (error) {
    logger(`⚠️  Could not get metrics: ${error}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options: InitOptions = {
    cosmosEndpoint: process.env.COSMOS_ENDPOINT || '',
    cosmosConnectionString: process.env.COSMOS_CONNECTION_STRING,
    databaseName: process.env.COSMOS_DATABASE_NAME || 'DigitalSponsor',
    skipMigrations: process.argv.includes('--skip-migrations'),
    skipSeedData: process.argv.includes('--skip-seed'),
    verbose: !process.argv.includes('--quiet')
  };

  if (!options.cosmosEndpoint && !options.cosmosConnectionString) {
    console.error('Error: COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING environment variable required');
    process.exit(1);
  }

  initializeDatabase(options)
    .then(() => {
      console.log('🎉 Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    });
}
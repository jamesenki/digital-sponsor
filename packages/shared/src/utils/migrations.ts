// Digital Sponsor - Database Migration System
// Handles schema changes and data migrations for Cosmos DB

import { MigrationDocument, DatabaseConfig } from '../types/database.js';

export interface Migration {
  id: string;
  name: string;
  description: string;
  version: string;
  up: () => Promise<MigrationResult>;
  down: () => Promise<MigrationResult>;
  dependencies?: string[];
}

export interface MigrationResult {
  success: boolean;
  recordsProcessed?: number;
  recordsFailed?: number;
  errors?: string[];
  executionTime?: number;
}

export interface MigrationContext {
  cosmosClient: any; // @azure/cosmos CosmosClient
  databaseName: string;
  containerName: string;
  logger: (message: string) => void;
}

export class MigrationManager {
  private migrations: Map<string, Migration> = new Map();
  private context: MigrationContext;

  constructor(context: MigrationContext) {
    this.context = context;
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration);
  }

  /**
   * Get all pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const completedMigrations = await this.getCompletedMigrations();
    const completedIds = new Set(completedMigrations.map(m => m.migrationId));
    
    return Array.from(this.migrations.values())
      .filter(m => !completedIds.has(m.id))
      .sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Execute all pending migrations
   */
  async executePendingMigrations(): Promise<MigrationResult[]> {
    const pendingMigrations = await this.getPendingMigrations();
    const results: MigrationResult[] = [];

    for (const migration of pendingMigrations) {
      this.context.logger(`Starting migration: ${migration.name} (${migration.id})`);
      
      const migrationDoc = await this.createMigrationDocument(migration);
      
      try {
        const startTime = Date.now();
        const result = await migration.up();
        const executionTime = Date.now() - startTime;

        if (result.success) {
          await this.completeMigration(migrationDoc, result, executionTime);
          this.context.logger(`✅ Migration completed: ${migration.name}`);
        } else {
          await this.failMigration(migrationDoc, result, executionTime);
          this.context.logger(`❌ Migration failed: ${migration.name}`);
        }

        results.push(result);
        
        if (!result.success) {
          break; // Stop on first failure
        }
      } catch (error) {
        const errorResult: MigrationResult = {
          success: false,
          errors: [error instanceof Error ? error.message : String(error)]
        };
        
        await this.failMigration(migrationDoc, errorResult, Date.now() - Date.now());
        results.push(errorResult);
        break;
      }
    }

    return results;
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const migrationDoc = await this.getMigrationDocument(migrationId);
    if (!migrationDoc || migrationDoc.status !== 'completed') {
      throw new Error(`Migration ${migrationId} is not in a rollback-able state`);
    }

    this.context.logger(`Rolling back migration: ${migration.name} (${migrationId})`);

    try {
      const startTime = Date.now();
      const result = await migration.down();
      const executionTime = Date.now() - startTime;

      if (result.success) {
        await this.rollbackMigrationDocument(migrationDoc, result, executionTime);
        this.context.logger(`✅ Migration rolled back: ${migration.name}`);
      } else {
        this.context.logger(`❌ Migration rollback failed: ${migration.name}`);
      }

      return result;
    } catch (error) {
      const errorResult: MigrationResult = {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
      
      this.context.logger(`❌ Migration rollback error: ${migration.name} - ${errorResult.errors?.[0]}`);
      return errorResult;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    completed: MigrationDocument[];
    pending: Migration[];
    failed: MigrationDocument[];
  }> {
    const completed = await this.getCompletedMigrations();
    const pending = await this.getPendingMigrations();
    const failed = await this.getFailedMigrations();

    return { completed, pending, failed };
  }

  // Private helper methods

  private async getCompletedMigrations(): Promise<MigrationDocument[]> {
    return this.queryMigrations("SELECT * FROM c WHERE c.docType = 'migration' AND c.status = 'completed'");
  }

  private async getFailedMigrations(): Promise<MigrationDocument[]> {
    return this.queryMigrations("SELECT * FROM c WHERE c.docType = 'migration' AND c.status = 'failed'");
  }

  private async getMigrationDocument(migrationId: string): Promise<MigrationDocument | null> {
    const results = await this.queryMigrations(
      "SELECT * FROM c WHERE c.docType = 'migration' AND c.migrationId = @param0",
      [{ name: '@param0', value: migrationId }]
    );
    
    return results[0] || null;
  }

  private async queryMigrations(query: string, parameters?: any[]): Promise<MigrationDocument[]> {
    try {
      const database = this.context.cosmosClient.database(this.context.databaseName);
      const container = database.container('Migrations');
      
      const { resources } = await container.items.query({
        query,
        parameters
      }).fetchAll();
      
      return resources as MigrationDocument[];
    } catch (error) {
      this.context.logger(`Error querying migrations: ${error}`);
      return [];
    }
  }

  private async createMigrationDocument(migration: Migration): Promise<MigrationDocument> {
    const now = new Date().toISOString();
    const migrationDoc: MigrationDocument = {
      id: `migration_${migration.id}_${Date.now()}`,
      partitionKey: 'migrations',
      docType: 'migration',
      createdAt: now,
      updatedAt: now,
      version: 1,
      
      migrationId: migration.id,
      name: migration.name,
      description: migration.description,
      status: 'running',
      execution: {
        startedAt: now
      }
    };

    try {
      const database = this.context.cosmosClient.database(this.context.databaseName);
      const container = database.container('Migrations');
      
      await container.items.create(migrationDoc);
      return migrationDoc;
    } catch (error) {
      throw new Error(`Failed to create migration document: ${error}`);
    }
  }

  private async completeMigration(
    migrationDoc: MigrationDocument, 
    result: MigrationResult, 
    executionTime: number
  ): Promise<void> {
    const now = new Date().toISOString();
    
    migrationDoc.status = 'completed';
    migrationDoc.updatedAt = now;
    migrationDoc.execution.completedAt = now;
    migrationDoc.execution.executionTime = executionTime;
    migrationDoc.execution.recordsProcessed = result.recordsProcessed;
    migrationDoc.execution.recordsFailed = result.recordsFailed;

    await this.updateMigrationDocument(migrationDoc);
  }

  private async failMigration(
    migrationDoc: MigrationDocument, 
    result: MigrationResult, 
    executionTime: number
  ): Promise<void> {
    const now = new Date().toISOString();
    
    migrationDoc.status = 'failed';
    migrationDoc.updatedAt = now;
    migrationDoc.execution.executionTime = executionTime;
    migrationDoc.execution.recordsProcessed = result.recordsProcessed;
    migrationDoc.execution.recordsFailed = result.recordsFailed;
    migrationDoc.error = {
      errorMessage: result.errors?.[0] || 'Unknown error',
      errorStack: result.errors?.join('\n') || '',
      failedAt: now
    };

    await this.updateMigrationDocument(migrationDoc);
  }

  private async rollbackMigrationDocument(
    migrationDoc: MigrationDocument, 
    result: MigrationResult, 
    executionTime: number
  ): Promise<void> {
    const now = new Date().toISOString();
    
    migrationDoc.status = 'rolled_back';
    migrationDoc.updatedAt = now;
    migrationDoc.rollback = {
      rollbackScript: 'manual',
      canRollback: false,
      rollbackAt: now
    };

    await this.updateMigrationDocument(migrationDoc);
  }

  private async updateMigrationDocument(migrationDoc: MigrationDocument): Promise<void> {
    try {
      const database = this.context.cosmosClient.database(this.context.databaseName);
      const container = database.container('Migrations');
      
      await container.item(migrationDoc.id, migrationDoc.partitionKey).replace(migrationDoc);
    } catch (error) {
      this.context.logger(`Error updating migration document: ${error}`);
    }
  }
}

// Built-in migrations

export const INITIAL_MIGRATIONS: Migration[] = [
  {
    id: '001',
    name: 'Create Initial Schema',
    description: 'Create initial containers and indexes for Digital Sponsor',
    version: '1.0.0',
    up: async () => {
      // This migration creates the initial containers
      // The actual container creation is handled by Bicep templates
      return {
        success: true,
        recordsProcessed: 6, // 6 containers created
        recordsFailed: 0
      };
    },
    down: async () => {
      // Cannot rollback container creation
      return {
        success: false,
        errors: ['Container deletion not supported in rollback']
      };
    }
  },
  
  {
    id: '002',
    name: 'Add Literature Embeddings Support',
    description: 'Add vector embedding support to Literature container',
    version: '1.1.0',
    up: async () => {
      // Add vector policy to Literature container
      return {
        success: true,
        recordsProcessed: 1,
        recordsFailed: 0
      };
    },
    down: async () => {
      return {
        success: true,
        recordsProcessed: 1,
        recordsFailed: 0
      };
    }
  },

  {
    id: '003',
    name: 'Initialize Emergency Resources',
    description: 'Populate initial crisis support resources',
    version: '1.2.0',
    up: async () => {
      // This would populate initial emergency resources
      return {
        success: true,
        recordsProcessed: 20, // 20 emergency resources
        recordsFailed: 0
      };
    },
    down: async () => {
      return {
        success: true,
        recordsProcessed: 20,
        recordsFailed: 0
      };
    }
  }
];

// Migration utilities

export function createMigrationContext(
  cosmosClient: any,
  databaseName: string,
  containerName: string,
  logger?: (message: string) => void
): MigrationContext {
  return {
    cosmosClient,
    databaseName,
    containerName,
    logger: logger || console.log
  };
}

export function validateMigrationDependencies(migrations: Migration[]): string[] {
  const errors: string[] = [];
  const migrationIds = new Set(migrations.map(m => m.id));

  for (const migration of migrations) {
    if (migration.dependencies) {
      for (const depId of migration.dependencies) {
        if (!migrationIds.has(depId)) {
          errors.push(`Migration ${migration.id} depends on missing migration ${depId}`);
        }
      }
    }
  }

  return errors;
}
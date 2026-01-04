// Digital Sponsor - Database Utilities
// Common operations for Cosmos DB with proper error handling

import { CosmosClient, Database, Container, FeedOptions } from '@azure/cosmos';
import { 
  BaseDocument, 
  LiteratureDocument, 
  UserSessionDocument, 
  StepWorkDocument,
  CrisisEventDocument,
  AnalyticsDocument 
} from '../types/database.js';

export interface DatabaseClientConfig {
  endpoint: string;
  key?: string;
  connectionString?: string;
  databaseName: string;
}

export interface QueryOptions {
  maxItemCount?: number;
  partitionKey?: string;
  enableCrossPartitionQuery?: boolean;
  continuationToken?: string;
}

export interface QueryResult<T> {
  items: T[];
  continuationToken?: string;
  requestCharge: number;
  hasMore: boolean;
}

export class DatabaseClient {
  private cosmosClient: CosmosClient;
  private database: Database;
  private databaseName: string;

  // Getter for cosmos client access
  get client(): CosmosClient {
    return this.cosmosClient;
  }

  constructor(config: DatabaseClientConfig) {
    this.databaseName = config.databaseName;
    
    if (config.connectionString) {
      this.cosmosClient = new CosmosClient(config.connectionString);
    } else if (config.key) {
      this.cosmosClient = new CosmosClient({
        endpoint: config.endpoint,
        key: config.key
      });
    } else {
      throw new Error('Either connectionString or key must be provided');
    }
    
    this.database = this.cosmosClient.database(config.databaseName);
  }

  /**
   * Get container reference
   */
  private getContainer(containerName: string): Container {
    return this.database.container(containerName);
  }

  /**
   * Create a document
   */
  async create<T extends BaseDocument>(
    containerName: string, 
    document: Omit<T, 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<T> {
    const now = new Date().toISOString();
    const fullDocument: T = {
      ...document,
      createdAt: now,
      updatedAt: now,
      version: 1
    } as T;

    try {
      const container = this.getContainer(containerName);
      const { resource } = await container.items.create(fullDocument);
      return resource as T;
    } catch (error) {
      throw new DatabaseError(`Failed to create document in ${containerName}`, error);
    }
  }

  /**
   * Get a document by ID and partition key
   */
  async getById<T extends BaseDocument>(
    containerName: string, 
    id: string, 
    partitionKey: string
  ): Promise<T | null> {
    try {
      const container = this.getContainer(containerName);
      const { resource } = await container.item(id, partitionKey).read<T>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw new DatabaseError(`Failed to get document ${id} from ${containerName}`, error);
    }
  }

  /**
   * Update a document
   */
  async update<T extends BaseDocument>(
    containerName: string, 
    id: string, 
    partitionKey: string, 
    updates: Partial<Omit<T, 'id' | 'partitionKey' | 'docType' | 'createdAt'>>
  ): Promise<T> {
    try {
      const container = this.getContainer(containerName);
      const existing = await this.getById<T>(containerName, id, partitionKey);
      
      if (!existing) {
        throw new Error(`Document ${id} not found in ${containerName}`);
      }

      const updatedDocument: T = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: existing.version + 1
      } as T;

      const { resource } = await container.item(id, partitionKey).replace(updatedDocument);
      return resource as T;
    } catch (error) {
      throw new DatabaseError(`Failed to update document ${id} in ${containerName}`, error);
    }
  }

  /**
   * Delete a document
   */
  async delete(containerName: string, id: string, partitionKey: string): Promise<void> {
    try {
      const container = this.getContainer(containerName);
      await container.item(id, partitionKey).delete();
    } catch (error: any) {
      if (error.code !== 404) {
        throw new DatabaseError(`Failed to delete document ${id} from ${containerName}`, error);
      }
    }
  }

  /**
   * Query documents
   */
  async query<T>(
    containerName: string, 
    query: string, 
    parameters?: any[], 
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    try {
      const container = this.getContainer(containerName);
      
      const feedOptions: FeedOptions = {
        maxItemCount: options?.maxItemCount,
        partitionKey: options?.partitionKey,
        continuationToken: options?.continuationToken
      };

      const querySpec = {
        query,
        parameters: parameters?.map((value, index) => ({
          name: `@param${index}`,
          value
        })) || []
      };

      const iterator = container.items.query<T>(querySpec, feedOptions);

      const { resources, requestCharge, continuationToken } = await iterator.fetchNext();

      return {
        items: resources || [],
        requestCharge,
        continuationToken,
        hasMore: !!continuationToken
      };
    } catch (error) {
      throw new DatabaseError(`Failed to query ${containerName}`, error);
    }
  }

  /**
   * Get all documents (paginated)
   */
  async getAll<T>(
    containerName: string, 
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    return this.query<T>(
      containerName,
      'SELECT * FROM c ORDER BY c._ts DESC',
      [],
      options
    );
  }

  /**
   * Count documents
   */
  async count(containerName: string, whereClause?: string): Promise<number> {
    const query = whereClause 
      ? `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`
      : 'SELECT VALUE COUNT(1) FROM c';
      
    const result = await this.query<number>(containerName, query, [], {
      maxItemCount: 1
    });
    
    return result.items[0] || 0;
  }

  /**
   * Batch operations
   */
  async batchCreate<T extends BaseDocument>(
    containerName: string,
    documents: Omit<T, 'createdAt' | 'updatedAt' | 'version'>[]
  ): Promise<T[]> {
    const container = this.getContainer(containerName);
    const results: T[] = [];
    
    // Process in batches of 100 (Cosmos DB limit)
    const batchSize = 100;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const now = new Date().toISOString();
      
      const fullDocuments = batch.map(doc => ({
        ...doc,
        createdAt: now,
        updatedAt: now,
        version: 1
      })) as T[];

      try {
        for (const doc of fullDocuments) {
          const { resource } = await container.items.create(doc);
          results.push(resource as T);
        }
      } catch (error) {
        throw new DatabaseError(`Failed batch create in ${containerName}`, error);
      }
    }
    
    return results;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; latency: number }> {
    const startTime = Date.now();
    
    try {
      const { resource } = await this.database.read();
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        message: `Database ${resource?.id || this.databaseName} is healthy`,
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        message: `Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
        latency
      };
    }
  }

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get container info
      const { resources: containers } = await this.database.containers.readAll().fetchAll();
      
      const metrics: DatabaseMetrics = {
        databaseName: this.databaseName,
        containerCount: containers.length,
        containers: []
      };

      for (const containerDef of containers) {
        try {
          const container = this.database.container(containerDef.id);
          const documentCount = await this.count(containerDef.id);
          
          metrics.containers.push({
            name: containerDef.id,
            documentCount,
            partitionKey: containerDef.partitionKey?.paths?.[0] || 'unknown'
          });
        } catch (error) {
          // Skip containers that can't be accessed
          continue;
        }
      }

      return metrics;
    } catch (error) {
      throw new DatabaseError('Failed to get database metrics', error);
    }
  }
}

// Literature-specific utilities
export class LiteratureRepository extends DatabaseClient {
  private readonly containerName = 'Literature';

  async createLiterature(literature: Omit<LiteratureDocument, keyof BaseDocument>): Promise<LiteratureDocument> {
    return this.create<LiteratureDocument>(this.containerName, {
      ...literature,
      id: `lit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      docType: 'literature',
      partitionKey: literature.type
    });
  }

  async searchByKeywords(keywords: string[], limit = 50): Promise<LiteratureDocument[]> {
    const keywordConditions = keywords.map((_, index) => 
      `ARRAY_CONTAINS(c.searchMetadata.keywords, @param${index})`
    ).join(' OR ');
    
    const query = `
      SELECT * FROM c 
      WHERE c.docType = 'literature' 
      AND (${keywordConditions})
      ORDER BY c.structure.step, c.structure.page
    `;

    const result = await this.query<LiteratureDocument>(
      this.containerName, 
      query, 
      keywords.map(keyword => keyword.toLowerCase()),
      { maxItemCount: limit }
    );
    
    return result.items;
  }

  async getByStep(stepNumber: number): Promise<LiteratureDocument[]> {
    const result = await this.query<LiteratureDocument>(
      this.containerName,
      'SELECT * FROM c WHERE c.docType = "literature" AND c.structure.step = @param0 ORDER BY c.structure.page',
      [stepNumber],
      { maxItemCount: 100 }
    );
    
    return result.items;
  }

  async getByType(type: string): Promise<QueryResult<LiteratureDocument>> {
    return this.query<LiteratureDocument>(
      this.containerName,
      'SELECT * FROM c WHERE c.docType = "literature" AND c.type = @param0 ORDER BY c.structure.page',
      [type],
      { partitionKey: type }
    );
  }
}

// Session-specific utilities
export class SessionRepository extends DatabaseClient {
  private readonly containerName = 'UserSessions';

  async createSession(session: Omit<UserSessionDocument, keyof BaseDocument>): Promise<UserSessionDocument> {
    return this.create<UserSessionDocument>(this.containerName, {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      docType: 'user_session',
      partitionKey: session.userId
    });
  }

  async getActiveSession(userId: string): Promise<UserSessionDocument | null> {
    const result = await this.query<UserSessionDocument>(
      this.containerName,
      'SELECT * FROM c WHERE c.docType = "user_session" AND c.userId = @param0 AND c.isActive = true ORDER BY c._ts DESC',
      [userId],
      { partitionKey: userId, maxItemCount: 1 }
    );
    
    return result.items[0] || null;
  }

  async updateLastAccessed(sessionId: string, userId: string): Promise<void> {
    await this.update<UserSessionDocument>(
      this.containerName,
      sessionId,
      userId,
      {
        lastAccessedAt: new Date().toISOString()
      }
    );
  }

  async expireSession(sessionId: string, userId: string): Promise<void> {
    await this.update<UserSessionDocument>(
      this.containerName,
      sessionId,
      userId,
      {
        isActive: false,
        expiresAt: new Date().toISOString()
      }
    );
  }
}

// Error classes
export class DatabaseError extends Error {
  public readonly originalError?: any;
  
  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

// Types for metrics
export interface DatabaseMetrics {
  databaseName: string;
  containerCount: number;
  containers: ContainerMetrics[];
}

export interface ContainerMetrics {
  name: string;
  documentCount: number;
  partitionKey: string;
}

// Factory function for creating database client
export function createDatabaseClient(config: DatabaseClientConfig): DatabaseClient {
  return new DatabaseClient(config);
}

export function createLiteratureRepository(config: DatabaseClientConfig): LiteratureRepository {
  return new LiteratureRepository(config);
}

export function createSessionRepository(config: DatabaseClientConfig): SessionRepository {
  return new SessionRepository(config);
}
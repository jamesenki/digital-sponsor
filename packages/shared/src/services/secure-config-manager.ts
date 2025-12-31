/**
 * Secure Configuration Manager
 * Manages secure access to Azure Key Vault secrets using Managed Identity
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export interface SecretValue {
  value: string;
  expiresOn?: Date;
  contentType?: string;
  tags?: Record<string, string>;
}

export interface SecureConfig {
  keyVaultUrl: string;
  enableCache: boolean;
  cacheTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class SecureConfigManager {
  private client: SecretClient;
  private cache = new Map<string, { value: SecretValue; expiry: number }>();
  private config: SecureConfig;
  private credential: DefaultAzureCredential;

  constructor(config: SecureConfig) {
    this.config = config;
    this.credential = new DefaultAzureCredential();
    this.client = new SecretClient(config.keyVaultUrl, this.credential);
  }

  /**
   * Get a secret value from Key Vault with caching support
   */
  async getSecret(secretName: string, useCache = true): Promise<string> {
    const cacheKey = this.getCacheKey(secretName);

    // Check cache first if enabled
    if (useCache && this.config.enableCache) {
      const cached = this.getCachedSecret(cacheKey);
      if (cached) {
        return cached.value;
      }
    }

    try {
      const secret = await this.retryOperation(async () => {
        return await this.client.getSecret(secretName);
      });

      if (!secret.value) {
        throw new Error(`Secret '${secretName}' has no value`);
      }

      const secretValue: SecretValue = {
        value: secret.value,
        expiresOn: secret.properties.expiresOn,
        contentType: secret.properties.contentType || undefined,
        tags: secret.properties.tags || {},
      };

      // Cache the result if enabled
      if (this.config.enableCache) {
        this.setCachedSecret(cacheKey, secretValue);
      }

      return secret.value;
    } catch (error) {
      throw new Error(
        `Failed to retrieve secret '${secretName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get OpenAI API key
   */
  async getOpenAIKey(): Promise<string> {
    return this.getSecret('openai-api-key');
  }

  /**
   * Get JWT secret for token signing
   */
  async getJWTSecret(): Promise<string> {
    return this.getSecret('jwt-secret');
  }

  /**
   * Get database connection string
   */
  async getDatabaseConnectionString(): Promise<string> {
    return this.getSecret('cosmos-connection-string');
  }

  /**
   * Get Redis connection string
   */
  async getRedisConnectionString(): Promise<string> {
    return this.getSecret('redis-connection-string');
  }

  /**
   * Get admin email address
   */
  async getAdminEmail(): Promise<string> {
    return this.getSecret('admin-email');
  }

  /**
   * Get SMTP configuration for email sending
   */
  async getSMTPConfig(): Promise<{
    host: string;
    port: number;
    user: string;
    password: string;
  }> {
    const [host, port, user, password] = await Promise.all([
      this.getSecret('smtp-host'),
      this.getSecret('smtp-port'),
      this.getSecret('smtp-user'),
      this.getSecret('smtp-password'),
    ]);

    return {
      host,
      port: parseInt(port, 10),
      user,
      password,
    };
  }

  /**
   * Set a secret in Key Vault
   */
  async setSecret(
    secretName: string,
    value: string,
    options?: {
      contentType?: string;
      tags?: Record<string, string>;
      expiresOn?: Date;
      enabled?: boolean;
    }
  ): Promise<void> {
    try {
      await this.retryOperation(async () => {
        return await this.client.setSecret(secretName, value, {
          contentType: options?.contentType,
          tags: options?.tags,
          expiresOn: options?.expiresOn,
          enabled: options?.enabled,
        });
      });

      // Invalidate cache for this secret
      if (this.config.enableCache) {
        this.cache.delete(this.getCacheKey(secretName));
      }
    } catch (error) {
      throw new Error(
        `Failed to set secret '${secretName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete a secret from Key Vault
   */
  async deleteSecret(secretName: string): Promise<void> {
    try {
      await this.retryOperation(async () => {
        const deleteOperation = await this.client.beginDeleteSecret(secretName);
        return await deleteOperation.pollUntilDone();
      });

      // Remove from cache
      if (this.config.enableCache) {
        this.cache.delete(this.getCacheKey(secretName));
      }
    } catch (error) {
      throw new Error(
        `Failed to delete secret '${secretName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List all secrets (names only for security)
   */
  async listSecrets(): Promise<string[]> {
    try {
      const secrets: string[] = [];
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        secrets.push(secretProperties.name);
      }
      return secrets;
    } catch (error) {
      throw new Error(
        `Failed to list secrets: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Rotate a secret (generates new value and updates Key Vault)
   */
  async rotateSecret(
    secretName: string,
    generator: () => string | Promise<string>
  ): Promise<void> {
    try {
      const newValue = await generator();
      const timestamp = new Date().toISOString();

      await this.setSecret(secretName, newValue, {
        contentType: 'text/plain',
        tags: {
          rotatedAt: timestamp,
          rotatedBy: 'secure-config-manager',
        },
      });

      // Store backup of previous version
      const backupName = `${secretName}-backup-${timestamp}`;
      const previousValue = await this.getSecret(secretName, false);
      await this.setSecret(backupName, previousValue, {
        contentType: 'text/plain',
        tags: {
          isBackup: 'true',
          originalSecret: secretName,
          createdAt: timestamp,
        },
        expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
    } catch (error) {
      throw new Error(
        `Failed to rotate secret '${secretName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get health status of Key Vault connection
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: Date;
  }> {
    try {
      // Try to list secrets as a health check
      await this.client.listPropertiesOfSecrets().next();
      return {
        status: 'healthy',
        message: 'Key Vault connection successful',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Key Vault connection failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Private methods
   */

  private getCacheKey(secretName: string): string {
    return `secret:${secretName}`;
  }

  private getCachedSecret(cacheKey: string): SecretValue | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  private setCachedSecret(cacheKey: string, secretValue: SecretValue): void {
    const expiry = Date.now() + this.config.cacheTimeout;
    this.cache.set(cacheKey, { value: secretValue, expiry });
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create SecureConfigManager instance
 */
export function createSecureConfigManager(
  keyVaultUrl: string,
  options: Partial<Omit<SecureConfig, 'keyVaultUrl'>> = {}
): SecureConfigManager {
  const config: SecureConfig = {
    keyVaultUrl,
    enableCache: options.enableCache ?? true,
    cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
    retryAttempts: options.retryAttempts ?? 3,
    retryDelay: options.retryDelay ?? 1000, // 1 second
  };

  return new SecureConfigManager(config);
}

/**
 * Singleton instance for application-wide use
 */
let globalConfigManager: SecureConfigManager | null = null;

export function getGlobalConfigManager(): SecureConfigManager {
  if (!globalConfigManager) {
    throw new Error(
      'Global config manager not initialized. Call initializeGlobalConfigManager first.'
    );
  }
  return globalConfigManager;
}

export function initializeGlobalConfigManager(keyVaultUrl: string): void {
  globalConfigManager = createSecureConfigManager(keyVaultUrl);
}

/**
 * Environment-specific configuration
 */
export const getKeyVaultUrl = (environment: string = 'dev'): string => {
  const baseUrl = 'https://kv-digitalsponsor{env}.vault.azure.net/';
  return baseUrl.replace(
    '{env}',
    environment === 'prod' ? 'prod' : environment
  );
};

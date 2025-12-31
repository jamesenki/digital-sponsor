// Azure Key Vault Module
// Secure secret and key management

@description('Name of the Key Vault')
param name string

@description('Location for the Key Vault')
param location string

@description('Principal ID of the managed identity to grant access')
param managedIdentityPrincipalId string

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('OpenAI API key to store securely')
@secure()
param openaiApiKey string

@description('Administrator email address')
param adminEmail string

@description('Tags to apply to the resource')
param tags object = {}

// Key Vault with RBAC enabled
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Grant Key Vault Secrets User role to managed identity
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentityPrincipalId, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Store OpenAI API key
resource openaiApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'openai-api-key'
  properties: {
    value: openaiApiKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Store admin email
resource adminEmailSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'admin-email'
  properties: {
    value: adminEmail
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// JWT secret for session management
resource jwtSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-secret'
  properties: {
    value: base64(guid(keyVault.id))
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// JWT refresh secret
resource jwtRefreshSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-refresh-secret'
  properties: {
    value: base64(guid(keyVault.id, 'refresh'))
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Step work encryption key
resource stepWorkEncryptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'step-work-encryption-key'
  properties: {
    value: base64(guid(keyVault.id, 'stepwork'))
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Session encryption key
resource sessionEncryptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'session-encryption-key'
  properties: {
    value: base64(guid(keyVault.id, 'session'))
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Crisis support configuration
resource crisisHotlineNational 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'crisis-hotline-national'
  properties: {
    value: '988'
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource crisisTextLine 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'crisis-text-line'
  properties: {
    value: '741741'
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// SMTP configuration placeholders
resource smtpHost 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'smtp-host'
  properties: {
    value: 'smtp.sendgrid.net'
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource smtpPort 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'smtp-port'
  properties: {
    value: '587'
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Diagnostic settings for Key Vault
resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: keyVault
  name: 'default'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
      {
        categoryGroup: 'allLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
  }
}

output id string = keyVault.id
output name string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
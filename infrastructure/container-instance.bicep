// Digital Sponsor - Container Instance deployment
// Using existing resources + Container Instance for the auth service

targetScope = 'resourceGroup'

@description('Environment name')
param environment string = 'prod'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Container image to deploy')
param containerImage string = 'nginx:latest'  // We'll build and update this

@description('Tags to apply to all resources')
param tags object = {
  application: 'Digital Sponsor'
  environment: environment
  managedBy: 'Bicep'
}

// Use existing resources
var resourceSuffix = 'digital-sponsor-${environment}'
var containerInstanceName = 'ci-${resourceSuffix}'
var existingKeyVaultName = 'kv-digitalsponsorprod'
var existingRedisName = 'redis-${resourceSuffix}'

// Get references to existing resources
resource existingKeyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: existingKeyVaultName
}

resource existingRedis 'Microsoft.Cache/Redis@2024-03-01' existing = {
  name: existingRedisName
}

// Create Container Instance
resource containerInstance 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: containerInstanceName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    containers: [
      {
        name: 'auth-service'
        properties: {
          image: containerImage
          ports: [
            {
              protocol: 'TCP'
              port: 80
            }
            {
              protocol: 'TCP'
              port: 3000
            }
          ]
          environmentVariables: [
            {
              name: 'NODE_ENV'
              value: environment
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'KEY_VAULT_URL'
              value: existingKeyVault.properties.vaultUri
            }
            {
              name: 'REDIS_URL'
              value: 'rediss://:${existingRedis.listKeys().primaryKey}@${existingRedis.properties.hostName}:${existingRedis.properties.sslPort}'
            }
            {
              name: 'AA_TRADITIONS_COMPLIANT'
              value: 'true'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'B2C_TENANT_NAME'
              value: 'placeholder-tenant'
            }
            {
              name: 'B2C_CLIENT_ID' 
              value: 'placeholder-client'
            }
            {
              name: 'JWT_SECRET'
              value: 'temporary-secret-key-update-with-keyvault'
            }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
            limits: {
              cpu: 1
              memoryInGB: 1
            }
          }
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: 'Always'
    ipAddress: {
      type: 'Public'
      ports: [
        {
          protocol: 'TCP'
          port: 80
        }
        {
          protocol: 'TCP'
          port: 3000
        }
      ]
      dnsNameLabel: containerInstanceName
    }
  }
}

// Grant Container Instance access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2024-04-01-preview' = {
  name: 'add'
  parent: existingKeyVault
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: containerInstance.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
  }
}

// Outputs
output containerInstanceUrl string = 'http://${containerInstance.properties.ipAddress.fqdn}:3000'
output containerInstanceName string = containerInstance.name
output keyVaultUrl string = existingKeyVault.properties.vaultUri
output redisHostName string = existingRedis.properties.hostName
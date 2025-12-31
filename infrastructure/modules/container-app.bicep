// Container App Module
// Backend API hosting with auto-scaling and health monitoring

@description('Name of the Container App')
param name string

@description('Location for the app')
param location string

@description('Container App Environment ID')
param containerAppEnvironmentId string

@description('Managed Identity ID')
param managedIdentityId string

@description('Container Registry name')
param containerRegistryName string

@description('Key Vault name')
param keyVaultName string

@description('Cosmos DB endpoint')
param cosmosDbEndpoint string

@description('Redis Cache hostname')
param redisCacheHostname string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Number of replicas')
@minValue(1)
@maxValue(10)
param replicas int = 2

@description('CPU allocation')
param cpu string = '0.5'

@description('Memory allocation')
param memory string = '1Gi'

@description('Custom domain (optional)')
param customDomain string = ''

@description('Tags to apply to the resource')
param tags object = {}

var containerImage = '${containerRegistryName}.azurecr.io/digital-sponsor-api:latest'

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        transport: 'auto'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        customDomains: !empty(customDomain) ? [
          {
            name: 'api.${customDomain}'
            bindingType: 'SniEnabled'
            certificateId: ''
          }
        ] : []
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'cosmos-connection-string'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/cosmos-connection-string'
          identity: managedIdentityId
        }
        {
          name: 'redis-connection-string'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/redis-connection-string'
          identity: managedIdentityId
        }
        {
          name: 'openai-api-key'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/openai-api-key'
          identity: managedIdentityId
        }
        {
          name: 'jwt-secret'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/jwt-secret'
          identity: managedIdentityId
        }
      ]
    }
    template: {
      revisionSuffix: 'v1'
      containers: [
        {
          name: 'digital-sponsor-api'
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: reference(managedIdentityId, '2023-01-31').clientId
            }
            {
              name: 'COSMOS_DB_ENDPOINT'
              value: cosmosDbEndpoint
            }
            {
              name: 'COSMOS_DB_CONNECTION_STRING'
              secretRef: 'cosmos-connection-string'
            }
            {
              name: 'REDIS_HOST'
              value: redisCacheHostname
            }
            {
              name: 'REDIS_CONNECTION_STRING'
              secretRef: 'redis-connection-string'
            }
            {
              name: 'OPENAI_API_KEY'
              secretRef: 'openai-api-key'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
            {
              name: 'KEY_VAULT_URL'
              value: 'https://${keyVaultName}.vault.azure.net/'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health/ready'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: replicas
        maxReplicas: replicas * 3
        rules: [
          {
            name: 'http-scaling-rule'
            http: {
              metadata: {
                concurrentRequests: '30'
              }
            }
          }
        ]
      }
    }
  }
}

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output latestRevisionName string = containerApp.properties.latestRevisionName
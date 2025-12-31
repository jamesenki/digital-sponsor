// Azure Redis Cache Module
// In-memory cache for session and API response caching

@description('Name of the Redis cache')
param name string

@description('Location for the cache')
param location string

@description('SKU name (Basic, Standard, Premium)')
@allowed(['Basic', 'Standard', 'Premium'])
param skuName string = 'Basic'

@description('SKU family (C for Basic/Standard, P for Premium)')
@allowed(['C', 'P'])
param skuFamily string = 'C'

@description('SKU capacity (0-6 for Basic/Standard, 1-5 for Premium)')
@minValue(0)
@maxValue(6)
param skuCapacity int = 0

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('Tags to apply to the resource')
param tags object = {}

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: skuName
      family: skuFamily
      capacity: skuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'maxmemory-reserved': '50'
      'maxfragmentationmemory-reserved': '50'
      'maxmemory-delta': '50'
    }
    redisVersion: '6'
  }
}

// Diagnostic settings for Redis Cache
resource redisDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: redisCache
  name: 'default'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
  }
}

output id string = redisCache.id
output hostname string = redisCache.properties.hostName
output port string = string(redisCache.properties.port)
output sslPort string = string(redisCache.properties.sslPort)
output accessKey string = redisCache.listKeys().primaryKey
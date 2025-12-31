// Azure Cosmos DB Module
// NoSQL database for application data

@description('Name of the Cosmos DB account')
param name string

@description('Location for the database')
param location string

@description('Request Units per second for provisioned throughput')
@minValue(400)
@maxValue(4000)
param throughput int = 400

@description('Principal ID of the managed identity to grant access')
param managedIdentityPrincipalId string

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('Tags to apply to the resource')
param tags object = {}

var databaseName = 'DigitalSponsor'
var containers = [
  {
    name: 'Literature'
    partitionKeyPath: '/type'
    indexingPolicy: {
      indexingMode: 'consistent'
      automatic: true
      includedPaths: [
        {
          path: '/*'
        }
      ]
      excludedPaths: [
        {
          path: '/"_etag"/?'
        }
      ]
      // Vector indexes will be configured post-deployment for AI embeddings
    }
  }
  {
    name: 'UserSessions'
    partitionKeyPath: '/userId'
    indexingPolicy: {
      indexingMode: 'consistent'
      automatic: true
    }
  }
  {
    name: 'StepWork'
    partitionKeyPath: '/userId'
    indexingPolicy: {
      indexingMode: 'consistent'
      automatic: true
    }
  }
  {
    name: 'CrisisSupport'
    partitionKeyPath: '/region'
    indexingPolicy: {
      indexingMode: 'consistent'
      automatic: true
    }
  }
  {
    name: 'Analytics'
    partitionKeyPath: '/date'
    indexingPolicy: {
      indexingMode: 'consistent'
      automatic: true
    }
  }
]

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-09-15' = {
  name: name
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: false
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    isVirtualNetworkFilterEnabled: false
    virtualNetworkRules: []
    disableKeyBasedMetadataWriteAccess: true
    enableAnalyticalStorage: false
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    cors: []
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    ipRules: []
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 720
        backupStorageRedundancy: 'Local'
      }
    }
    networkAclBypass: 'AzureServices'
  }
}

// Database
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-09-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: {
      throughput: throughput
    }
  }
}

// Containers
resource literatureContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-09-15' = [for container in containers: {
  parent: database
  name: container.name
  properties: {
    resource: {
      id: container.name
      partitionKey: {
        paths: [container.partitionKeyPath]
        kind: 'Hash'
      }
      indexingPolicy: container.indexingPolicy
      conflictResolutionPolicy: {
        mode: 'LastWriterWins'
        conflictResolutionPath: '/_ts'
      }
    }
  }
}]

// Grant Cosmos DB Built-in Data Contributor role to managed identity
resource cosmosDbDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosAccount.id, managedIdentityPrincipalId, 'Cosmos DB Built-in Data Contributor')
  scope: cosmosAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00000000-0000-0000-0000-000000000002') // Cosmos DB Built-in Data Contributor
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostic settings
resource cosmosDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: cosmosAccount
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
        category: 'Requests'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
  }
}

output id string = cosmosAccount.id
output endpoint string = cosmosAccount.properties.documentEndpoint
output databaseName string = databaseName
output connectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
// Container App Environment Module
// Managed environment for Container Apps with monitoring integration

@description('Name of the Container App Environment')
param name string

@description('Location for the environment')
param location string

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Tags to apply to the resource')
param tags object = {}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2022-10-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2022-10-01').primarySharedKey
      }
    }
    daprAIConnectionString: appInsightsConnectionString
    zoneRedundant: false
    kedaConfiguration: {}
    customDomainConfiguration: {
      certificatePassword: ''
      dnsSuffix: ''
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

// Storage configuration for shared volumes (if needed)
resource storageConfig 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: containerAppEnvironment
  name: 'shared-storage'
  properties: {
    azureFile: {
      accountName: 'digitalsponsorstg${uniqueString(containerAppEnvironment.id)}'
      accountKey: ''
      shareName: 'shared'
      accessMode: 'ReadWrite'
    }
  }
}

output id string = containerAppEnvironment.id
output name string = containerAppEnvironment.name
output defaultDomain string = containerAppEnvironment.properties.defaultDomain
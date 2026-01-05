// Digital Sponsor - Health Service Function App
// Minimal microservice with zero dependencies

targetScope = 'resourceGroup'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Application name prefix')
param appName string = 'digitalsponsor'

@description('Tags to apply to all resources')
param tags object = {
  application: 'Digital Sponsor'
  environment: environment
  managedBy: 'Bicep'
  costCenter: 'Recovery Services'
  architecture: 'Microservices'
  service: 'health'
}

// Variables for resource naming
var resourceSuffix = '${appName}-${environment}'
var healthFunctionAppName = 'health-${resourceSuffix}'
var appServicePlanName = 'asp-health-${resourceSuffix}'

// Reference to existing shared resources
var storageAccountName = 'st${take(replace(resourceSuffix, '-', ''), 22)}'
var appInsightsName = 'appi-${resourceSuffix}'

// Reference existing storage account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// Reference existing Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// App Service Plan for Health Service (Consumption)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'Y1'  // Consumption plan for minimal cost
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

// Health Service Function App
resource healthFunctionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: healthFunctionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(healthFunctionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      use32BitWorkerProcess: false
      cors: {
        allowedOrigins: [
          'https://digitalsponsor.commonsolution.org'
          'https://portal.azure.com'
        ]
        supportCredentials: true
      }
    }
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

// Outputs
output healthFunctionAppName string = healthFunctionApp.name
output healthFunctionAppUrl string = 'https://${healthFunctionApp.properties.defaultHostName}'
output resourceGroupName string = resourceGroup().name
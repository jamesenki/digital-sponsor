// Digital Sponsor - Token Validation Service Function App
// JWT-only microservice for token validation

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
  service: 'token-validation'
}

// Variables for resource naming
var resourceSuffix = '${appName}-${environment}'
var tokenFunctionAppName = 'token-${resourceSuffix}'
var appServicePlanName = 'asp-token-${resourceSuffix}'

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

// App Service Plan for Token Service (Consumption)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'Y1'  // Consumption plan for cost efficiency
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

// Token Validation Service Function App
resource tokenFunctionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: tokenFunctionAppName
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
          value: toLower(tokenFunctionAppName)
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
        {
          name: 'B2C_TENANT_NAME'
          value: 'digitalsponsor'
        }
        {
          name: 'B2C_TENANT_DOMAIN'
          value: 'digitalsponsor.onmicrosoft.com'
        }
        {
          name: 'B2C_CLIENT_ID'
          value: 'placeholder-client-id'
        }
        {
          name: 'B2C_POLICY_NAME'
          value: 'B2C_1_SignUpSignIn'
        }
        {
          name: 'JWT_SECRET'
          value: 'temp-secret-key-for-testing'
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
output tokenFunctionAppName string = tokenFunctionApp.name
output tokenFunctionAppUrl string = 'https://${tokenFunctionApp.properties.defaultHostName}'
output resourceGroupName string = resourceGroup().name
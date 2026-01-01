// Digital Sponsor - Main Azure Infrastructure Template
// This template deploys the complete Azure architecture for Digital Sponsor
// Following Azure Well-Architected Framework principles

targetScope = 'resourceGroup'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Application name prefix')
param appName string = 'digital-sponsor'

@description('OpenAI API key for secure storage in Key Vault')
@secure()
param openaiApiKey string

@description('Administrator email address')
param adminEmail string = 'admin@commonsolution.org'

@description('Custom domain name (optional)')
param customDomain string = ''

@description('Tags to apply to all resources')
param tags object = {
  application: 'Digital Sponsor'
  environment: environment
  managedBy: 'Bicep'
  costCenter: 'Recovery Services'
}

// Variables for resource naming
var resourceSuffix = '${appName}-${environment}'
var keyVaultName = 'kv-${take(replace(resourceSuffix, '-', ''), 24)}'
var logAnalyticsName = 'log-${resourceSuffix}'
var appInsightsName = 'appi-${resourceSuffix}'
var containerRegistryName = 'cr${replace(resourceSuffix, '-', '')}'
var cosmosDbName = 'cosmos-${resourceSuffix}'
var redisCacheName = 'redis-${resourceSuffix}'
var staticWebAppName = 'swa-${resourceSuffix}'
var containerAppEnvName = 'cae-${resourceSuffix}'
var containerAppName = 'ca-${resourceSuffix}-api'
var managedIdentityName = 'id-${resourceSuffix}'

// Environment-specific configurations
var environmentConfig = {
  dev: {
    cosmosDbThroughput: 400
    redisCacheSku: 'Basic'
    redisCacheFamily: 'C'
    redisCacheCapacity: 0
    containerAppReplicas: 1
    containerAppCpu: '0.25'
    containerAppMemory: '0.5Gi'
  }
  staging: {
    cosmosDbThroughput: 800
    redisCacheSku: 'Basic'
    redisCacheFamily: 'C'
    redisCacheCapacity: 1
    containerAppReplicas: 2
    containerAppCpu: '0.5'
    containerAppMemory: '1Gi'
  }
  prod: {
    cosmosDbThroughput: 1000
    redisCacheSku: 'Standard'
    redisCacheFamily: 'C'
    redisCacheCapacity: 1
    containerAppReplicas: 3
    containerAppCpu: '1'
    containerAppMemory: '2Gi'
  }
}

var currentConfig = environmentConfig[environment]

// Managed Identity for secure service-to-service communication
module managedIdentity 'modules/managed-identity.bicep' = {
  name: 'managedIdentity'
  params: {
    name: managedIdentityName
    location: location
    tags: tags
  }
}

// Log Analytics Workspace for centralized logging
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: logAnalyticsName
    location: location
    retentionInDays: environment == 'prod' ? 90 : 30
    tags: tags
  }
}

// Application Insights for application monitoring
module appInsights 'modules/app-insights.bicep' = {
  name: 'appInsights'
  params: {
    name: appInsightsName
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: tags
  }
}

// Azure Key Vault for secure secret management
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    openaiApiKey: openaiApiKey
    adminEmail: adminEmail
    tags: tags
  }
}

// B2C Tenant Configuration (outputs only - tenant must be created manually)
module b2cConfig 'modules/b2c-tenant.bicep' = {
  name: 'b2cConfig'
  params: {
    environment: environment
    projectName: appName
    location: location
  }
}

// Container Registry for backend API images
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'containerRegistry'
  params: {
    name: containerRegistryName
    location: location
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: tags
  }
}

// Cosmos DB for application data storage
module cosmosDb 'modules/cosmos-db.bicep' = {
  name: 'cosmosDb'
  params: {
    name: cosmosDbName
    location: location
    throughput: currentConfig.cosmosDbThroughput
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: tags
  }
}

// Redis Cache for session and API caching
module redisCache 'modules/redis-cache.bicep' = {
  name: 'redisCache'
  params: {
    name: redisCacheName
    location: location
    skuName: currentConfig.redisCacheSku
    skuFamily: currentConfig.redisCacheFamily
    skuCapacity: currentConfig.redisCacheCapacity
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: tags
  }
}

// Static Web App for frontend hosting
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    name: staticWebAppName
    location: location
    customDomain: customDomain
    tags: tags
  }
}

// Container App Environment for backend hosting
module containerAppEnvironment 'modules/container-app-environment.bicep' = {
  name: 'containerAppEnvironment'
  params: {
    name: containerAppEnvName
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    appInsightsConnectionString: appInsights.outputs.connectionString
    tags: tags
  }
}

// Container App for backend API
module containerApp 'modules/container-app.bicep' = {
  name: 'containerApp'
  params: {
    name: containerAppName
    location: location
    containerAppEnvironmentId: containerAppEnvironment.outputs.id
    managedIdentityId: managedIdentity.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    keyVaultName: keyVault.outputs.name
    cosmosDbEndpoint: cosmosDb.outputs.endpoint
    redisCacheHostname: redisCache.outputs.hostname
    appInsightsConnectionString: appInsights.outputs.connectionString
    replicas: currentConfig.containerAppReplicas
    cpu: currentConfig.containerAppCpu
    memory: currentConfig.containerAppMemory
    customDomain: customDomain
    tags: tags
  }
}

// Outputs for CI/CD pipeline and other integrations
output managedIdentityClientId string = managedIdentity.outputs.clientId
output managedIdentityPrincipalId string = managedIdentity.outputs.principalId
output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.vaultUri
output containerRegistryName string = containerRegistry.outputs.name
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output cosmosDbEndpoint string = cosmosDb.outputs.endpoint
output cosmosDbDatabaseName string = cosmosDb.outputs.databaseName
output redisCacheHostname string = redisCache.outputs.hostname
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname
output containerAppName string = containerApp.outputs.name
output containerAppFqdn string = containerApp.outputs.fqdn
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
output appInsightsConnectionString string = appInsights.outputs.connectionString
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

// B2C Configuration Outputs
output b2cTenantName string = b2cConfig.outputs.tenantName
output b2cTenantDomain string = b2cConfig.outputs.tenantDomain
output b2cSignUpSignInPolicy string = b2cConfig.outputs.signUpSignInPolicyId
output b2cEditProfilePolicy string = b2cConfig.outputs.editProfilePolicyId
output b2cPasswordResetPolicy string = b2cConfig.outputs.passwordResetPolicyId
output b2cApiScopes array = b2cConfig.outputs.apiScopes
output b2cMsalConfig object = b2cConfig.outputs.msalConfig

// Resource Group tags
resource rgTags 'Microsoft.Resources/tags@2021-04-01' = {
  name: 'default'
  properties: {
    tags: tags
  }
}
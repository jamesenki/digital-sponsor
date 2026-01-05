@description('The environment name (dev, staging, prod)')
param environment string = 'prod'

@description('The location for the resources')
param location string = resourceGroup().location

// Shared resources (created by main infrastructure)
resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: 'appi-digitalsponsor-${environment}'
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-02-01' existing = {
  name: 'stdigitalsponsor${environment}'
}

// Function App Service Plan (Consumption Y1 SKU)
resource servicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: 'plan-auth-v2-digitalsponsor-${environment}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

// Function App for Authentication Service V2
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  name: 'auth-v2-digitalsponsor-${environment}'
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: servicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower('auth-v2-digitalsponsor-${environment}')
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
        // B2C Configuration for EasyAuth
        {
          name: 'B2C_TENANT_NAME'
          value: 'digitalsponsor'
        }
        {
          name: 'B2C_TENANT_DOMAIN'
          value: 'digitalsponsor.onmicrosoft.com'
        }
        {
          name: 'B2C_POLICY_NAME'
          value: 'B2C_1_SignUpSignIn'
        }
        {
          name: 'B2C_CLIENT_ID'
          value: 'your-b2c-client-id-here'
        }
      ]
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      netFrameworkVersion: 'v6.0'
    }
    httpsOnly: true
  }
}

// Configure Authentication/Authorization (EasyAuth) for Azure AD B2C
resource functionAppAuth 'Microsoft.Web/sites/config@2021-02-01' = {
  name: 'authsettingsV2'
  parent: functionApp
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      requireAuthentication: false // Allow anonymous access to some endpoints
      unauthenticatedClientAction: 'AllowAnonymous'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          openIdIssuer: 'https://digitalsponsor.b2clogin.com/digitalsponsor.onmicrosoft.com/v2.0/'
          clientId: 'your-b2c-client-id-here'
          clientSecretSettingName: 'B2C_CLIENT_SECRET'
        }
        validation: {
          allowedAudiences: [
            'your-b2c-client-id-here'
          ]
        }
      }
    }
    login: {
      routes: {
        logoutEndpoint: '/.auth/logout'
      }
      tokenStore: {
        enabled: true
      }
    }
  }
}

// Output
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output principalId string = functionApp.identity.principalId
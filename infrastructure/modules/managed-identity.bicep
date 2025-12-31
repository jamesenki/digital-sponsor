// Managed Identity Module
// Creates a user-assigned managed identity for secure service-to-service authentication

@description('Name of the managed identity')
param name string

@description('Location for the managed identity')
param location string

@description('Tags to apply to the resource')
param tags object = {}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: name
  location: location
  tags: tags
}

output id string = managedIdentity.id
output clientId string = managedIdentity.properties.clientId
output principalId string = managedIdentity.properties.principalId
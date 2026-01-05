@description('Application Gateway for Digital Sponsor with HTTPS termination')
param location string = 'centralus'
param environmentName string = 'prod'

@description('Domain configuration')
param primaryDomain string = 'digitalsponsor.commonsolution.org'
param apiDomain string = 'api.digitalsponsor.commonsolution.org'

@description('Backend container endpoints')
param authServiceEndpoint string = 'digitalsponsor-auth-prod.centralus.azurecontainer.io'
param literatureServiceEndpoint string = 'digitalsponsor-literature-massive.centralus.azurecontainer.io'
param chatServiceEndpoint string = 'digitalsponsor-chat-v2.centralus.azurecontainer.io'

// Virtual Network for Application Gateway
resource vnet 'Microsoft.Network/virtualNetworks@2023-02-01' = {
  name: 'vnet-digitalsponsor-${environmentName}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'appgw-subnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
        }
      }
    ]
  }
}

// Public IP for Application Gateway
resource publicIP 'Microsoft.Network/publicIPAddresses@2023-02-01' = {
  name: 'pip-digitalsponsor-appgw-${environmentName}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Regional'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    dnsSettings: {
      domainNameLabel: 'digitalsponsor-api-${environmentName}'
    }
  }
}

// Web Application Firewall Policy
resource wafPolicy 'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies@2023-02-01' = {
  name: 'wafpolicy-digitalsponsor-${environmentName}'
  location: location
  properties: {
    policySettings: {
      requestBodyCheck: true
      maxRequestBodySizeInKb: 128
      fileUploadLimitInMb: 100
      state: 'Enabled'
      mode: 'Prevention'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'OWASP'
          ruleSetVersion: '3.2'
          ruleGroupOverrides: []
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleGroupOverrides: []
        }
      ]
      exclusions: []
    }
    customRules: [
      {
        name: 'RateLimitRule'
        priority: 1
        ruleType: 'RateLimitRule'
        action: 'Block'
        rateLimitDuration: 'OneMin'
        rateLimitThreshold: 100
        groupByUserSession: [
          {
            groupByVariables: [
              {
                variableName: 'ClientAddr'
              }
            ]
          }
        ]
        matchConditions: [
          {
            matchVariables: [
              {
                variableName: 'RemoteAddr'
              }
            ]
            operator: 'IPMatch'
            negationConditon: false
            matchValues: [
              '0.0.0.0/0'
            ]
          }
        ]
      }
    ]
  }
}

// Application Gateway
resource appGateway 'Microsoft.Network/applicationGateways@2023-02-01' = {
  name: 'appgw-digitalsponsor-${environmentName}'
  location: location
  properties: {
    sku: {
      name: 'WAF_v2'
      tier: 'WAF_v2'
      capacity: 2
    }
    gatewayIPConfigurations: [
      {
        name: 'appGatewayIpConfig'
        properties: {
          subnet: {
            id: vnet.properties.subnets[0].id
          }
        }
      }
    ]
    frontendIPConfigurations: [
      {
        name: 'appGwPublicFrontendIp'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: publicIP.id
          }
        }
      }
    ]
    frontendPorts: [
      {
        name: 'port_80'
        properties: {
          port: 80
        }
      }
      {
        name: 'port_443'
        properties: {
          port: 443
        }
      }
    ]
    backendAddressPools: [
      {
        name: 'auth-backend-pool'
        properties: {
          backendAddresses: [
            {
              fqdn: authServiceEndpoint
            }
          ]
        }
      }
      {
        name: 'literature-backend-pool'
        properties: {
          backendAddresses: [
            {
              fqdn: literatureServiceEndpoint
            }
          ]
        }
      }
      {
        name: 'chat-backend-pool'
        properties: {
          backendAddresses: [
            {
              fqdn: chatServiceEndpoint
            }
          ]
        }
      }
    ]
    backendHttpSettingsCollection: [
      {
        name: 'auth-backend-settings'
        properties: {
          port: 8080
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: true
          requestTimeout: 30
          probe: {
            id: resourceId('Microsoft.Network/applicationGateways/probes', 'appgw-digitalsponsor-${environmentName}', 'auth-health-probe')
          }
        }
      }
      {
        name: 'literature-backend-settings'
        properties: {
          port: 3002
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: true
          requestTimeout: 30
          probe: {
            id: resourceId('Microsoft.Network/applicationGateways/probes', 'appgw-digitalsponsor-${environmentName}', 'literature-health-probe')
          }
        }
      }
      {
        name: 'chat-backend-settings'
        properties: {
          port: 3003
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: true
          requestTimeout: 30
          probe: {
            id: resourceId('Microsoft.Network/applicationGateways/probes', 'appgw-digitalsponsor-${environmentName}', 'chat-health-probe')
          }
        }
      }
    ]
    httpListeners: [
      {
        name: 'api-http-listener'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', 'appgw-digitalsponsor-${environmentName}', 'appGwPublicFrontendIp')
          }
          frontendPort: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendPorts', 'appgw-digitalsponsor-${environmentName}', 'port_80')
          }
          protocol: 'Http'
          hostName: apiDomain
        }
      }
    ]
    requestRoutingRules: [
      {
        name: 'auth-routing-rule'
        properties: {
          ruleType: 'PathBasedRouting'
          httpListener: {
            id: resourceId('Microsoft.Network/applicationGateways/httpListeners', 'appgw-digitalsponsor-${environmentName}', 'api-http-listener')
          }
          urlPathMap: {
            id: resourceId('Microsoft.Network/applicationGateways/urlPathMaps', 'appgw-digitalsponsor-${environmentName}', 'api-path-map')
          }
        }
      }
    ]
    urlPathMaps: [
      {
        name: 'api-path-map'
        properties: {
          defaultBackendAddressPool: {
            id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'appgw-digitalsponsor-${environmentName}', 'auth-backend-pool')
          }
          defaultBackendHttpSettings: {
            id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'appgw-digitalsponsor-${environmentName}', 'auth-backend-settings')
          }
          pathRules: [
            {
              name: 'auth-path-rule'
              properties: {
                paths: [
                  '/api/auth/*'
                  '/api/register'
                  '/api/login'
                  '/api/validate-invitation'
                  '/api/admin/*'
                  '/health'
                ]
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'appgw-digitalsponsor-${environmentName}', 'auth-backend-pool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'appgw-digitalsponsor-${environmentName}', 'auth-backend-settings')
                }
              }
            }
            {
              name: 'literature-path-rule'
              properties: {
                paths: [
                  '/api/literature/*'
                  '/api/search'
                ]
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'appgw-digitalsponsor-${environmentName}', 'literature-backend-pool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'appgw-digitalsponsor-${environmentName}', 'literature-backend-settings')
                }
              }
            }
            {
              name: 'chat-path-rule'
              properties: {
                paths: [
                  '/api/chat/*'
                ]
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'appgw-digitalsponsor-${environmentName}', 'chat-backend-pool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'appgw-digitalsponsor-${environmentName}', 'chat-backend-settings')
                }
              }
            }
          ]
        }
      }
    ]
    probes: [
      {
        name: 'auth-health-probe'
        properties: {
          protocol: 'Http'
          path: '/health'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
          pickHostNameFromBackendHttpSettings: true
          minServers: 0
          match: {
            statusCodes: [
              '200-399'
            ]
          }
        }
      }
      {
        name: 'literature-health-probe'
        properties: {
          protocol: 'Http'
          path: '/health'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
          pickHostNameFromBackendHttpSettings: true
          minServers: 0
          match: {
            statusCodes: [
              '200-399'
            ]
          }
        }
      }
      {
        name: 'chat-health-probe'
        properties: {
          protocol: 'Http'
          path: '/health'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
          pickHostNameFromBackendHttpSettings: true
          minServers: 0
          match: {
            statusCodes: [
              '200-399'
            ]
          }
        }
      }
    ]
    webApplicationFirewallConfiguration: {
      enabled: true
      firewallMode: 'Detection'
      ruleSetType: 'OWASP'
      ruleSetVersion: '3.2'
      maxRequestBodySizeInKb: 128
      fileUploadLimitInMb: 100
      requestBodyCheck: true
    }
  }
}

// Output the public IP for DNS configuration
output publicIPAddress string = publicIP.properties.ipAddress
output publicIPFQDN string = publicIP.properties.dnsSettings.fqdn
output applicationGatewayName string = appGateway.name
/**
 * Azure AD B2C Tenant Configuration
 * Configures B2C tenant for Digital Sponsor authentication with AA Traditions compliance
 */

param environment string = 'dev'
param projectName string = 'digital-sponsor'
param location string = resourceGroup().location

// B2C Configuration
param b2cTenantName string = '${projectName}${environment}'
param customDomainName string = ''
param enableCustomDomain bool = false

// User Flow Configuration
param signUpSignInPolicyName string = 'B2C_1_SignUpSignIn'
param editProfilePolicyName string = 'B2C_1_EditProfile'
param passwordResetPolicyName string = 'B2C_1_PasswordReset'

// MFA Configuration
param enableMFA bool = true
param mfaMethods array = ['sms', 'email', 'authenticator']

// Custom Attributes for AA Compliance
param customAttributes array = [
  {
    name: 'AnonymousMode'
    displayName: 'Anonymous Mode'
    dataType: 'Boolean'
    userInputType: 'CheckboxMultiSelect'
    required: false
    description: 'User preference for anonymous participation (AA Tradition 11)'
  }
  {
    name: 'PreferredName'
    displayName: 'Preferred Name'
    dataType: 'String'
    userInputType: 'TextBox'
    required: false
    description: 'Display name for meetings (first name only for anonymity)'
  }
  {
    name: 'SobrietyDate'
    displayName: 'Sobriety Date'
    dataType: 'DateTime'
    userInputType: 'DateTimeDropdown'
    required: false
    description: 'Optional sobriety date for step work tracking'
  }
  {
    name: 'HomeMeetingId'
    displayName: 'Home Meeting'
    dataType: 'String'
    userInputType: 'DropdownSingleSelect'
    required: false
    description: 'Optional home meeting affiliation'
  }
  {
    name: 'CrisisContactConsent'
    displayName: 'Crisis Support Contact Consent'
    dataType: 'Boolean'
    userInputType: 'CheckboxMultiSelect'
    required: true
    description: 'Consent to be contacted in crisis situations'
  }
]

// Application Registration
param frontendAppName string = '${projectName}-frontend-${environment}'
param backendApiName string = '${projectName}-api-${environment}'

// API Scopes for AA-compliant permissions
param apiScopes array = [
  {
    name: 'step-work.read'
    displayName: 'Read Step Work'
    description: 'Read personal step work entries'
    consentType: 'User'
  }
  {
    name: 'step-work.write'
    displayName: 'Write Step Work'
    description: 'Create and update personal step work entries'
    consentType: 'User'
  }
  {
    name: 'meetings.read'
    displayName: 'Read Meeting Information'
    description: 'View meeting schedules and information'
    consentType: 'User'
  }
  {
    name: 'chat.participate'
    displayName: 'Participate in AI Chat'
    description: 'Access AI-powered step work guidance'
    consentType: 'User'
  }
  {
    name: 'crisis.access'
    displayName: 'Access Crisis Support'
    description: 'Access crisis support resources and hotlines'
    consentType: 'User'
  }
]

// Note: Azure B2C tenant creation requires manual setup or Azure CLI
// This template provides the configuration structure for automated setup

// Variables
var tenantDomain = '${b2cTenantName}.onmicrosoft.com'
var customDomain = enableCustomDomain ? customDomainName : tenantDomain

// Outputs for use in other templates and applications
output tenantName string = b2cTenantName
output tenantDomain string = tenantDomain
output customDomain string = customDomain
output tenantId string = subscription().tenantId

output signUpSignInPolicyId string = signUpSignInPolicyName
output editProfilePolicyId string = editProfilePolicyName
output passwordResetPolicyId string = passwordResetPolicyName

output frontendClientId string = frontendAppName
output backendApiId string = backendApiName

output apiScopes array = [for scope in apiScopes: {
  name: scope.name
  fullName: 'https://${customDomain}/${scope.name}'
  displayName: scope.displayName
  description: scope.description
}]

// Custom Attributes Output
output customAttributes array = customAttributes

// MFA Configuration Output
output mfaConfig object = {
  enabled: enableMFA
  methods: mfaMethods
  enforceForAllUsers: environment == 'prod'
  gracePeriodDays: environment == 'dev' ? 30 : 7
}

// AA Traditions Compliance Notes
output complianceNotes object = {
  tradition6: 'No endorsement of external enterprises - scopes limited to personal recovery tools'
  tradition8: 'No professional advice - AI guidance limited to literature-based support'
  tradition11: 'Anonymity support - AnonymousMode attribute and preferred name options'
  tradition12: 'Personal recovery focus - all permissions centered on individual step work'
}

// Recommended Security Configuration
output securityRecommendations array = [
  'Enable Conditional Access policies for suspicious sign-ins'
  'Configure session management with appropriate timeouts'
  'Implement risk-based authentication for sensitive operations'
  'Enable audit logging for all authentication events'
  'Configure password complexity requirements'
  'Enable account lockout protection'
  'Implement CAPTCHA for registration to prevent automated accounts'
  'Configure email verification for all new accounts'
]

// MSAL Configuration Template
output msalConfig object = {
  auth: {
    clientId: '[FRONTEND_CLIENT_ID]' // To be replaced during deployment
    authority: 'https://${customDomain}/${signUpSignInPolicyName}'
    knownAuthorities: [customDomain]
    redirectUri: environment == 'prod' ? 'https://digitalsponsor.app' : 'http://localhost:3000'
    postLogoutRedirectUri: environment == 'prod' ? 'https://digitalsponsor.app' : 'http://localhost:3000'
  }
  cache: {
    cacheLocation: 'localStorage' // or 'sessionStorage' for enhanced privacy
    storeAuthStateInCookie: false
  }
  system: {
    loggerOptions: {
      loggerCallback: '(level, message, containsPii) => { /* Custom logging */ }'
      piiLoggingEnabled: false
      logLevel: environment == 'dev' ? 'Verbose' : 'Error'
    }
    allowNativeBroker: false
    windowHashTimeout: 60000
    iframeHashTimeout: 6000
    loadFrameTimeout: 0
  }
}

// Environment-specific Redirect URIs
output redirectUris object = {
  dev: [
    'http://localhost:3000'
    'http://localhost:3000/auth/callback'
    'http://localhost:3000/auth/silent-callback'
  ]
  staging: [
    'https://staging.digitalsponsor.app'
    'https://staging.digitalsponsor.app/auth/callback'
    'https://staging.digitalsponsor.app/auth/silent-callback'
  ]
  prod: [
    'https://digitalsponsor.app'
    'https://digitalsponsor.app/auth/callback'
    'https://digitalsponsor.app/auth/silent-callback'
  ]
}
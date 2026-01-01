# Azure AD B2C Setup Guide

This guide provides step-by-step instructions for setting up Azure AD B2C for the Digital Sponsor
application with AA Traditions compliance.

## Overview

Azure AD B2C provides secure authentication with support for:

- Multi-factor authentication
- Custom user attributes for AA compliance
- Anonymous mode support (AA Tradition 11)
- Custom branding and user flows
- Crisis contact consent tracking

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and logged in
- Resource group created from TASK-003

## Step 1: Create B2C Tenant

### Manual Setup (Required)

B2C tenant creation must be done through the Azure Portal:

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Identity** → **Azure Active Directory B2C**
3. Choose **Create a new Azure AD B2C Tenant**
4. Fill in the details:
   - **Organization name**: Digital Sponsor
   - **Initial domain name**:
     - Dev: `digitalsponsordev`
     - Staging: `digitalsponsorstaging`
     - Prod: `digitalsponsor`
   - **Country/Region**: United States
   - **Subscription**: Your Azure subscription
   - **Resource group**: Use existing `digital-sponsor-{env}-rg`
   - **Location**: East US

5. Click **Create** and wait for deployment (5-10 minutes)

### Link B2C Tenant to Subscription

1. After tenant creation, go to **Azure AD B2C** service
2. Click **Link an existing Azure AD B2C Tenant to my Azure subscription**
3. Select your B2C tenant and resource group
4. Choose a resource name (e.g., `digital-sponsor-b2c-{env}`)

## Step 2: Configure Custom Attributes

Navigate to **Azure AD B2C** → **User attributes** and create these custom attributes:

### AnonymousMode

- **Name**: AnonymousMode
- **Data type**: Boolean
- **Description**: Enable anonymous participation (AA Tradition 11)

### PreferredName

- **Name**: PreferredName
- **Data type**: String
- **Description**: Display name for meetings (first name only for anonymity)

### SobrietyDate

- **Name**: SobrietyDate
- **Data type**: DateTime
- **Description**: Optional sobriety date for step work tracking

### HomeMeetingId

- **Name**: HomeMeetingId
- **Data type**: String
- **Description**: Optional home meeting affiliation

### CrisisContactConsent

- **Name**: CrisisContactConsent
- **Data type**: Boolean
- **Description**: Consent to be contacted in crisis situations

### DataRetentionChoice

- **Name**: DataRetentionChoice
- **Data type**: String
- **Description**: User's preference for data retention period

## Step 3: Create Application Registrations

### Backend API Application

1. Go to **Azure AD B2C** → **App registrations** → **New registration**
2. Settings:
   - **Name**: `digital-sponsor-api-{env}`
   - **Supported account types**: Accounts in any organizational directory or any identity provider
   - **Redirect URI**: Web → `https://digital-sponsor-{env}.azurecontainerapps.io/auth/callback`
3. After creation, note the **Application (client) ID**

#### Configure API Scopes

1. Go to **Expose an API** → **Add a scope**
2. Create these scopes:

| Scope Name         | Display Name             | Description                                  | Consent Type |
| ------------------ | ------------------------ | -------------------------------------------- | ------------ |
| `step-work.read`   | Read Step Work           | Read personal step work entries              | User         |
| `step-work.write`  | Write Step Work          | Create and update personal step work entries | User         |
| `meetings.read`    | Read Meeting Information | View meeting schedules and information       | User         |
| `chat.participate` | Participate in AI Chat   | Access AI-powered step work guidance         | User         |
| `crisis.access`    | Access Crisis Support    | Access crisis support resources              | User         |

### Frontend Application

1. Go to **Azure AD B2C** → **App registrations** → **New registration**
2. Settings:
   - **Name**: `digital-sponsor-frontend-{env}`
   - **Supported account types**: Accounts in any organizational directory or any identity provider
   - **Redirect URI**: Single-page application (SPA) → Environment-specific URL:
     - Dev: `http://localhost:3000`
     - Staging: `https://staging.digitalsponsor.app`
     - Prod: `https://digitalsponsor.app`

#### Additional Redirect URIs

Add these redirect URIs in **Authentication**:

- `{base_url}/auth/callback`
- `{base_url}/auth/silent-callback`

#### Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Choose **My APIs** → Select your backend API
3. Add all the scopes created above

## Step 4: Create User Flows

### Sign Up and Sign In Flow

1. Go to **Azure AD B2C** → **User flows** → **New user flow**
2. Select **Sign up and sign in** → **Recommended** version
3. Settings:
   - **Name**: `SignUpSignIn`
   - **Identity providers**: ✅ Email signup
   - **Multifactor authentication**: Email (Conditional for dev, Always for prod)

#### User Attributes (Collect during signup)

- ✅ Email Address
- ✅ Given Name
- ✅ Surname
- ✅ AnonymousMode (custom)
- ✅ PreferredName (custom)
- SobrietyDate (custom) - optional
- HomeMeetingId (custom) - optional
- ✅ CrisisContactConsent (custom) - required
- ✅ DataRetentionChoice (custom)

#### Application Claims (Return in token)

- ✅ Email Addresses
- ✅ Given Name
- ✅ Surname
- ✅ User's Object ID
- ✅ AnonymousMode
- ✅ PreferredName
- ✅ SobrietyDate
- ✅ HomeMeetingId
- ✅ CrisisContactConsent
- ✅ DataRetentionChoice

### Profile Editing Flow

1. Create new user flow: **Profile editing** → **Recommended**
2. Settings:
   - **Name**: `EditProfile`
   - **Identity providers**: Local Account
   - **Multifactor authentication**: Email (when needed)

#### User Attributes

- ✅ Given Name
- ✅ Surname
- ✅ AnonymousMode (custom)
- ✅ PreferredName (custom)
- ✅ SobrietyDate (custom)
- ✅ HomeMeetingId (custom)
- ✅ DataRetentionChoice (custom)

### Password Reset Flow

1. Create new user flow: **Password reset** → **Recommended**
2. Settings:
   - **Name**: `PasswordReset`
   - **Identity providers**: Reset password using email address

## Step 5: Custom Branding (Optional)

### Page Layout Customization

1. Go to **User flows** → **SignUpSignIn** → **Page layouts**
2. For **Unified sign up or sign in page**:
   - ✅ Use custom page content
   - **Custom page URI**: Upload the `aa-compliance-signup.html` to Azure Blob Storage and provide
     URL
3. Repeat for other pages as needed

### Company Branding

1. Go to **Azure AD B2C** → **Company branding**
2. Configure:
   - **Background color**: `#2c5f3e` (Digital Sponsor primary)
   - **Banner logo**: Upload Digital Sponsor logo
   - **Username hint**: "Enter your email address"
   - **Sign-in page text**: "Welcome to Digital Sponsor - Your recovery companion that follows AA
     Traditions"

## Step 6: Security Configuration

### Conditional Access (Production Only)

1. Go to **Azure AD B2C** → **Security** → **Conditional Access**
2. Create policies for:
   - **Risk-based authentication**: Block high-risk sign-ins
   - **Device compliance**: Require managed devices for admin access
   - **Location-based access**: Block suspicious locations

### Identity Protection

1. Enable **Identity Protection** features:
   - User risk policy
   - Sign-in risk policy
   - MFA registration policy

## Step 7: Run Setup Script

Use the provided script to automate configuration:

```bash
# Make script executable
chmod +x infrastructure/scripts/setup-b2c-tenant.sh

# Run for development environment
./infrastructure/scripts/setup-b2c-tenant.sh dev

# Run for production environment
./infrastructure/scripts/setup-b2c-tenant.sh prod
```

The script will:

- Create application registrations
- Generate configuration files
- Store secrets in Key Vault
- Provide setup validation

## Step 8: Update Configuration Files

### Frontend Configuration

Update the client ID in your environment files:

```bash
# .env.development
REACT_APP_B2C_CLIENT_ID=your-frontend-client-id

# .env.production
REACT_APP_B2C_CLIENT_ID=your-production-frontend-client-id
```

### Backend Configuration

Update API configuration in Key Vault or environment variables:

```bash
B2C_TENANT_DOMAIN=digitalsponsor{env}.onmicrosoft.com
B2C_CLIENT_ID=your-backend-api-id
B2C_POLICY_NAME=B2C_1_SignUpSignIn
```

## Step 9: Test Authentication Flow

### Test Signup

1. Navigate to your frontend application
2. Click **Sign Up**
3. Verify custom attributes appear
4. Complete signup with test account
5. Verify tokens contain custom claims

### Test Anonymous Mode

1. Sign up with **AnonymousMode** enabled
2. Verify display name shows as preferred name only
3. Check that identifying information is masked

### Test Crisis Consent

1. Try signing up without checking crisis consent
2. Verify error message and requirement enforcement

## Step 10: Production Checklist

Before going live:

- [ ] MFA enabled and configured for production
- [ ] Custom domain configured (optional)
- [ ] Conditional access policies enabled
- [ ] Audit logging configured
- [ ] User journey tested end-to-end
- [ ] AA Traditions compliance verified
- [ ] Crisis support flow tested
- [ ] Data retention policies configured
- [ ] Security policies reviewed

## Troubleshooting

### Common Issues

**Custom attributes not appearing**

- Ensure custom attributes are added to user flow configuration
- Check that attribute names match exactly (case-sensitive)

**Authentication failing**

- Verify redirect URIs match exactly
- Check client IDs in configuration
- Ensure user flow names are correct

**Claims missing from tokens**

- Verify claims are selected in user flow application claims
- Check token configuration in relying party

**MFA not working**

- Verify MFA is enabled in user flow
- Check email delivery (may be in spam folder)
- Ensure MFA methods are properly configured

### Support Resources

- [Azure AD B2C Documentation](https://docs.microsoft.com/azure/active-directory-b2c/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Digital Sponsor B2C Issues](https://github.com/digital-sponsor/issues)

## AA Traditions Compliance Notes

This B2C setup ensures compliance with AA Traditions:

- **Tradition 6**: No endorsement - scoped permissions limited to personal recovery tools
- **Tradition 8**: No professional advice - system provides literature-based guidance only
- **Tradition 11**: Anonymity support - anonymous mode and preferred name features
- **Tradition 12**: Personal recovery focus - all features centered on individual step work

The configuration supports anonymous participation while maintaining security and crisis support
capabilities.

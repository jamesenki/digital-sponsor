# Digital Sponsor - Security & Secret Management

This document outlines the comprehensive security architecture and secret management system for
Digital Sponsor, implementing enterprise-grade security practices with Azure Key Vault.

## 🔐 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Frontend (SWA)  │    │ Backend (Container Apps)        │ │
│  │ • Client-side   │    │ • Server-side encryption       │ │
│  │   encryption    │    │ • Managed Identity auth         │ │
│  │ • Secure forms  │    │ • Key Vault integration        │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                 Security Layer                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Azure Key Vault │    │ Managed Identity                │ │
│  │ • Secret storage│    │ • Service authentication       │ │
│  │ • Access policies│   │ • RBAC enforcement              │ │
│  │ • Audit logging │    │ • No credential management      │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Storage Layer                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Cosmos DB       │    │ Redis Cache                     │ │
│  │ • Encryption    │    │ • TLS encryption                │ │
│  │   at rest       │    │ • Secure connections            │ │
│  │ • TLS in transit│    │ • Authentication required       │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Vault Secret Management

### Secret Categories

#### **1. Authentication & Authorization**

- `jwt-secret` - JWT token signing key
- `jwt-refresh-secret` - Refresh token signing key
- `session-encryption-key` - Session data encryption

#### **2. External Service Integration**

- `openai-api-key` - OpenAI API access key
- `smtp-host`, `smtp-port`, `smtp-user`, `smtp-password` - Email configuration
- `meeting-finder-api-key` - Meeting service integration
- `literature-api-key` - Literature service integration

#### **3. Database Connections**

- `cosmos-connection-string` - Cosmos DB connection
- `redis-connection-string` - Redis cache connection
- `cosmos-endpoint` - Cosmos DB endpoint URL

#### **4. Client-Side Encryption**

- `step-work-encryption-key` - Step work data encryption
- `file-encryption-key` - File encryption for uploads

#### **5. Crisis Support**

- `crisis-hotline-national` - National crisis hotline (988)
- `crisis-text-line` - Crisis text line (741741)
- `aa-central-office` - AA Central Office contact

#### **6. Administrative**

- `admin-email` - Administrator contact
- `support-email` - Support team contact

### Secret Rotation Strategy

#### **Automatic Rotation (Recommended Schedule)**

| Secret Type          | Rotation Frequency | Impact | Automation |
| -------------------- | ------------------ | ------ | ---------- |
| JWT secrets          | 90 days            | Low    | Automated  |
| Encryption keys      | 180 days           | Medium | Automated  |
| Session keys         | 30 days            | Low    | Automated  |
| Database credentials | 365 days           | High   | Automated  |
| API keys             | Manual             | Medium | Manual     |

#### **Emergency Rotation**

```bash
# Emergency rotation of all secrets
./infrastructure/scripts/rotate-secrets.sh prod "" "" emergency
```

## 🛡️ Encryption Implementation

### Client-Side Encryption (Step Work Data)

```typescript
import { StepWorkEncryption } from '@digital-sponsor/shared';

// Initialize encryption for user
const encryption = new StepWorkEncryption(userPassword);

// Encrypt step work entry
const entry = {
  step: 4,
  content: 'My resentments and fears...',
  timestamp: new Date(),
  metadata: { version: 1 },
};

const encrypted = await encryption.encryptEntry(entry);
```

### Server-Side Secret Management

```typescript
import { SecureConfigManager } from '@digital-sponsor/shared';

// Initialize with Key Vault URL
const config = new SecureConfigManager({
  keyVaultUrl: 'https://kv-digitalsponsorprod.vault.azure.net/',
  enableCache: true,
  cacheTimeout: 300000, // 5 minutes
});

// Get secrets securely
const openaiKey = await config.getOpenAIKey();
const dbConnection = await config.getDatabaseConnectionString();
```

### Session Encryption

```typescript
import { SessionEncryption } from '@digital-sponsor/shared';

// Initialize session encryption
const sessionEncryption = new SessionEncryption();
await sessionEncryption.initializeSession();

// Encrypt sensitive session data
const encrypted = await sessionEncryption.encryptSessionData(sensitiveData);

// Store in session/cache
redis.set(sessionId, encrypted.data, encrypted.iv);
```

## 🔒 Access Control & Permissions

### Managed Identity RBAC

```bicep
// Key Vault Secrets User role for Container Apps
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentityPrincipalId, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}
```

### Application Permissions

| Service        | Key Vault Role  | Cosmos DB Role   | Redis Access |
| -------------- | --------------- | ---------------- | ------------ |
| Frontend (SWA) | None            | None             | None         |
| Backend API    | Secrets User    | Data Contributor | Full Access  |
| CI/CD Pipeline | Secrets Officer | None             | None         |
| Admin Scripts  | Administrator   | Administrator    | Admin        |

## 📊 Security Monitoring

### Key Vault Audit Events

```kql
// Monitor secret access patterns
KeyVaultData
| where OperationName in ("SecretGet", "SecretSet", "SecretDelete")
| summarize count() by CallerIpAddress, OperationName, bin(TimeGenerated, 1h)
| order by TimeGenerated desc
```

### Anomaly Detection

```kql
// Detect unusual access patterns
KeyVaultData
| where OperationName == "SecretGet"
| summarize AccessCount = count() by CallerIpAddress, bin(TimeGenerated, 1h)
| where AccessCount > 100  // Threshold for investigation
```

### Failed Authentication Attempts

```kql
// Monitor failed access attempts
KeyVaultData
| where ResultType == "Unauthorized"
| summarize FailedAttempts = count() by CallerIpAddress, bin(TimeGenerated, 15m)
| where FailedAttempts > 5
```

## 🚨 Incident Response

### Security Event Playbooks

#### **1. Suspected Secret Compromise**

```bash
# Immediate response
./infrastructure/scripts/rotate-secrets.sh prod "" compromised-secret emergency

# Audit trail
az monitor activity-log list --correlation-id <incident-id>

# Review access logs
az keyvault secret show --vault-name kv-digitalsponsorprod --name <secret-name>
```

#### **2. Unauthorized Access Detection**

1. **Isolate**: Disable compromised managed identity
2. **Assess**: Review audit logs for scope of access
3. **Rotate**: Emergency rotation of all accessed secrets
4. **Monitor**: Enhanced monitoring for 72 hours
5. **Document**: Incident report and lessons learned

#### **3. Data Breach Response**

1. **Contain**: Revoke all access tokens
2. **Assess**: Determine data exposure scope
3. **Notify**: Follow breach notification requirements
4. **Remediate**: Implement additional security controls
5. **Monitor**: Continuous monitoring for further compromise

## 🔧 Security Configuration

### Environment-Specific Settings

#### **Development Environment**

- Shorter secret rotation cycles (for testing)
- Additional logging and monitoring
- Test data only - no production secrets

#### **Staging Environment**

- Production-like security configuration
- Synthetic test data
- Full audit logging enabled

#### **Production Environment**

- Maximum security configuration
- All monitoring and alerting enabled
- Compliance audit trails
- Encrypted backups

### Key Vault Configuration

```json
{
  "enableSoftDelete": true,
  "softDeleteRetentionInDays": 90,
  "enablePurgeProtection": true,
  "enableRbacAuthorization": true,
  "networkAcls": {
    "defaultAction": "Allow",
    "bypass": "AzureServices"
  }
}
```

## 📋 Compliance & Audit

### AA Traditions Compliance

- **Tradition 12**: No endorsements - no tracking of individual recovery progress
- **Anonymity**: Client-side encryption ensures server cannot decrypt step work
- **Privacy**: Minimal data collection, user-controlled data retention

### Security Standards

- **OWASP Top 10**: All vulnerabilities addressed
- **Azure Security Baseline**: Fully implemented
- **Zero Trust**: Never trust, always verify
- **Defense in Depth**: Multiple security layers

### Audit Requirements

#### **Daily Checks**

- Monitor Key Vault access logs
- Review failed authentication attempts
- Check secret rotation schedule

#### **Weekly Reviews**

- Audit user access patterns
- Review security event logs
- Validate backup integrity

#### **Monthly Assessments**

- Security configuration review
- Vulnerability assessment
- Penetration testing (staging)

#### **Quarterly Audits**

- Full compliance review
- Access right certification
- Disaster recovery testing

## 🛠️ Tools & Scripts

### Setup Commands

```bash
# Initial secret configuration
./infrastructure/scripts/setup-secrets.sh prod

# Manual secret rotation
./infrastructure/scripts/rotate-secrets.sh prod kv-digitalsponsorprod jwt-secret

# Emergency procedures
./infrastructure/scripts/rotate-secrets.sh prod "" "" emergency
```

### Monitoring Commands

```bash
# Check Key Vault health
az keyvault show --name kv-digitalsponsorprod --query properties.vaultUri

# List recent secret access
az monitor activity-log list --resource-group rg-digital-sponsor-prod

# Validate RBAC assignments
az role assignment list --scope /subscriptions/{sub}/resourceGroups/rg-digital-sponsor-prod
```

### Backup & Recovery

```bash
# Backup all secrets (development only)
az keyvault secret list --vault-name kv-digitalsponsordev --query "[].{name:name}" -o tsv | \
  xargs -I {} az keyvault secret backup --vault-name kv-digitalsponsordev --name {} --file {}.backup

# Restore secret from backup
az keyvault secret restore --vault-name kv-digitalsponsordev --file secret-name.backup
```

## 🎯 Best Practices

### Development Guidelines

1. **Never hardcode secrets** in source code
2. **Use managed identity** for all Azure service authentication
3. **Implement proper error handling** for Key Vault operations
4. **Cache secrets appropriately** with reasonable TTL
5. **Log access attempts** but never log secret values
6. **Validate secret format** before use
7. **Implement circuit breakers** for Key Vault operations

### Operational Procedures

1. **Regular rotation** of all rotatable secrets
2. **Monitoring and alerting** on unusual access patterns
3. **Backup verification** and recovery testing
4. **Documentation updates** when adding new secrets
5. **Access review** quarterly for all service principals
6. **Incident response** procedures tested semi-annually

### Security Checklist

- [ ] All secrets stored in Key Vault
- [ ] Managed Identity configured for all services
- [ ] RBAC permissions follow least privilege
- [ ] Audit logging enabled and monitored
- [ ] Secret rotation schedule implemented
- [ ] Emergency response procedures documented
- [ ] Backup and recovery tested
- [ ] Compliance requirements validated

---

_This security configuration implements defense-in-depth principles with Azure-native services,
ensuring the highest level of protection for Digital Sponsor user data and application secrets._

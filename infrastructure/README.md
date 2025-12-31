# Digital Sponsor - Azure Infrastructure as Code

This directory contains the complete Azure infrastructure definition for Digital Sponsor using Bicep
templates. The infrastructure follows Azure Well-Architected Framework principles with security,
scalability, and reliability as core design principles.

## 🏗️ Architecture Overview

The infrastructure implements a modern, cloud-native architecture on Azure:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Front Door                         │
│                     (Global Load Balancer)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│ Static │    │ Container   │    │   CDN     │
│ Web    │    │ Apps        │    │ (Static   │
│ Apps   │    │ (API)       │    │ Content)  │
└────────┘    └──────┬──────┘    └───────────┘
                     │
            ┌────────┼────────┐
            │                 │
        ┌───▼────┐    ┌──────▼──────┐
        │ Cosmos │    │ Redis Cache │
        │ DB     │    │ (Sessions)  │
        └────────┘    └─────────────┘
```

### Core Services

- **Azure Static Web Apps**: Frontend hosting with global CDN
- **Container Apps**: Serverless backend API hosting
- **Cosmos DB**: NoSQL database for application data
- **Redis Cache**: Session and API response caching
- **Key Vault**: Secure secret and certificate management
- **Container Registry**: Docker image storage
- **Application Insights**: Monitoring and telemetry
- **Log Analytics**: Centralized logging

## 📁 Directory Structure

```
infrastructure/
├── main.bicep                 # Main infrastructure template
├── modules/                   # Modular Bicep templates
│   ├── managed-identity.bicep
│   ├── key-vault.bicep
│   ├── container-registry.bicep
│   ├── cosmos-db.bicep
│   ├── redis-cache.bicep
│   ├── static-web-app.bicep
│   ├── container-app-environment.bicep
│   ├── container-app.bicep
│   ├── log-analytics.bicep
│   └── app-insights.bicep
├── parameters/               # Environment-specific parameters
│   ├── dev.parameters.json
│   ├── staging.parameters.json
│   └── prod.parameters.json
├── scripts/                  # Deployment automation
│   ├── deploy.sh
│   └── destroy.sh
└── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and authenticated
2. **Bicep CLI** installed (auto-installed by Azure CLI)
3. **Appropriate Azure permissions** for resource creation
4. **OpenAI API key** stored in a shared Key Vault

### Basic Deployment

```bash
# Deploy to development environment
./scripts/deploy.sh dev

# Deploy to staging with specific subscription
./scripts/deploy.sh staging 12345678-1234-1234-1234-123456789012

# Deploy to production
./scripts/deploy.sh prod
```

### Environment-Specific Configurations

| Environment | Cosmos DB Throughput | Redis SKU   | Container App Replicas |
| ----------- | -------------------- | ----------- | ---------------------- |
| **dev**     | 400 RU/s             | Basic C0    | 1                      |
| **staging** | 800 RU/s             | Basic C1    | 2                      |
| **prod**    | 1000 RU/s            | Standard C1 | 3                      |

## 🔧 Configuration

### Parameter Files

Each environment has its own parameter file in `parameters/`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": { "value": "dev" },
    "appName": { "value": "digital-sponsor" },
    "location": { "value": "East US 2" },
    "openaiApiKey": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-shared-secrets/providers/Microsoft.KeyVault/vaults/kv-shared-secrets"
        },
        "secretName": "openai-api-key"
      }
    }
  }
}
```

### Custom Domain Setup

For production deployments with custom domains:

1. Update `customDomain` parameter in `prod.parameters.json`
2. Configure DNS records after deployment
3. Validate domain ownership in Azure

## 🔐 Security Features

### Managed Identity

- **User-assigned managed identity** for secure service-to-service communication
- **No hardcoded secrets** in application code
- **Role-based access control** for Azure resources

### Key Vault Integration

- **Secure storage** of OpenAI API keys and other secrets
- **Automatic rotation** capabilities
- **Audit logging** for all access attempts
- **RBAC-based access** control

### Network Security

- **HTTPS enforcement** across all services
- **Private endpoints** for sensitive resources (production)
- **Network isolation** between environments
- **Azure Front Door** for DDoS protection

## 📊 Monitoring & Observability

### Application Insights

```typescript
// Automatic telemetry collection
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
appInsights.start();
```

### Log Analytics

- **Centralized logging** from all services
- **Custom dashboards** for operational insights
- **Alerting rules** for proactive monitoring
- **Query-based analysis** with KQL

### Key Metrics Tracked

- API response times and error rates
- Container App scaling events
- Cosmos DB request units and throttling
- Redis cache hit rates
- Static Web App traffic patterns

## 💰 Cost Optimization

### Development Environment

**Estimated Monthly Cost: $62**

- Cosmos DB Serverless: $25
- Redis Basic C0: $17
- Container Apps Consumption: $15
- Other services: $5

### Production Environment

**Estimated Monthly Cost: $128**

- Cosmos DB Standard: $45
- Redis Standard C1: $75
- Container Apps: $50
- Static Web Apps Standard: $9
- Monitoring & Storage: $20

### Cost Optimization Features

- **Serverless Cosmos DB** for development
- **Auto-scaling** Container Apps based on demand
- **CDN caching** to reduce origin requests
- **Reserved instances** for production workloads

## 🛠️ Advanced Usage

### Manual Resource Management

```bash
# Validate Bicep template
az bicep build --file main.bicep

# Deploy with custom parameters
az deployment group create \
  --resource-group rg-digital-sponsor-dev \
  --template-file main.bicep \
  --parameters @parameters/dev.parameters.json

# View deployment status
az deployment group show \
  --resource-group rg-digital-sponsor-dev \
  --name digital-sponsor-dev-20241231-120000
```

### Container App Management

```bash
# Scale Container App
az containerapp update \
  --name ca-digital-sponsor-dev-api \
  --resource-group rg-digital-sponsor-dev \
  --min-replicas 2 \
  --max-replicas 5

# View logs
az containerapp logs show \
  --name ca-digital-sponsor-dev-api \
  --resource-group rg-digital-sponsor-dev
```

### Database Operations

```bash
# Connect to Cosmos DB
az cosmosdb sql database create \
  --account-name cosmos-digital-sponsor-dev \
  --resource-group rg-digital-sponsor-dev \
  --name AdditionalDatabase

# Monitor metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/rg-digital-sponsor-dev/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-digital-sponsor-dev \
  --metric TotalRequestUnits
```

## 🔄 CI/CD Integration

### GitHub Actions Secrets

The deployment script automatically configures GitHub secrets:

```yaml
AZURE_CREDENTIALS_DEV           # Service principal for dev environment
AZURE_CREDENTIALS_STAGING       # Service principal for staging environment
AZURE_CREDENTIALS_PROD          # Service principal for production environment
AZURE_CONTAINER_REGISTRY        # Container registry for images
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Apps deployment token
```

### Deployment Pipeline Integration

```yaml
- name: Deploy Infrastructure
  run: |
    ./infrastructure/scripts/deploy.sh ${{ github.event.inputs.environment }}

- name: Get Infrastructure Outputs
  id: infra
  run: |
    echo "api-url=$(jq -r '.containerAppFqdn.value' .azure-outputs-${{ github.event.inputs.environment }}.json)" >> $GITHUB_OUTPUT
```

## 🧹 Cleanup

### Safe Resource Deletion

```bash
# Remove development environment
./scripts/destroy.sh dev

# Remove staging with confirmation
./scripts/destroy.sh staging

# Remove production (requires manual confirmation)
./scripts/destroy.sh prod
```

### Backup Before Deletion

Always backup critical data before destroying environments:

```bash
# Export Cosmos DB data
az cosmosdb sql container export \
  --account-name cosmos-digital-sponsor-prod \
  --database-name DigitalSponsor \
  --container-name Literature \
  --output-path ./backup/

# Export Key Vault secrets
az keyvault secret list \
  --vault-name kv-digitalsponsor-prod \
  --query "[].{name:name,value:value}" > ./backup/secrets.json
```

## 📋 Troubleshooting

### Common Issues

**Deployment Failures:**

```bash
# Check deployment status
az deployment group show --resource-group rg-digital-sponsor-dev --name <deployment-name>

# View error details
az deployment operation group list --resource-group rg-digital-sponsor-dev --name <deployment-name>
```

**Permission Issues:**

```bash
# Verify current user permissions
az role assignment list --assignee $(az account show --query user.name -o tsv) --resource-group rg-digital-sponsor-dev

# Check service principal permissions
az ad sp show --id <service-principal-id> --query appRoles
```

**Connectivity Problems:**

```bash
# Test Container App health
curl https://<container-app-fqdn>/api/health

# Check Static Web App
curl https://<static-web-app-fqdn>

# Verify DNS resolution
nslookup <custom-domain>
```

### Resource Limits

Be aware of Azure subscription limits:

- Cosmos DB: 50 accounts per subscription
- Container Apps: 20 environments per subscription
- Key Vault: 1000 vaults per subscription
- Static Web Apps: 100 apps per subscription

### Support Resources

- [Azure Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)

---

_This infrastructure configuration implements enterprise-grade practices for secure, scalable, and
cost-effective deployment of the Digital Sponsor application on Azure._

# Digital Sponsor - Redeployment Guide

This guide will help you clean up the old Azure deployment and deploy the new microservices
architecture.

## 🔍 Current Situation

**Old Deployment (to be removed):**

- Resource Group: `rg-commonsolution-prod`
- Location: `eastus2`
- Resources:
  - PostgreSQL: `pg-commonsolution-prod`
  - Redis: `redis-commonsolution-prod`
  - Container Registry: `acrcommonsolution`
  - Container App: `ca-digitalsponsor-backend`
  - Static Web App: `swa-digitalsponsor`
  - Log Analytics: `workspace-rgcommonsolutionprodYzZP`

**DNS Resources (keep or migrate):**

- Resource Group: `digitalsponsor`
- Domain: `commonsolution.org`
- DNS Zone: `commonsolution.org`

## 🚨 Pre-Cleanup Checklist

Before proceeding, ensure you have:

1. **Backup critical data:**

   ```bash
   # Backup PostgreSQL database
   pg_dump -h pg-commonsolution-prod.postgres.database.azure.com \
           -U your_admin_user \
           -d digitalsponsor > backup.sql

   # Backup Redis data (if needed)
   redis-cli --rdb backup.rdb
   ```

2. **Document current environment variables:**

   ```bash
   az containerapp show \
     --name ca-digitalsponsor-backend \
     --resource-group rg-commonsolution-prod \
     --query "properties.template.containers[0].env" \
     --output table
   ```

3. **Export current DNS settings:**

   ```bash
   az network dns record-set list \
     --zone-name commonsolution.org \
     --resource-group digitalsponsor \
     --output table
   ```

4. **Verify you have necessary secrets:**
   - Azure credentials for GitHub Actions
   - B2C tenant details
   - JWT secrets
   - Database connection strings

## 🧹 Step 1: Clean Up Old Deployment

1. **Run the cleanup script:**

   ```bash
   ./cleanup-old-deployment.sh
   ```

2. **Or manually delete resources:**

   ```bash
   # Delete the main application resources
   az group delete --name rg-commonsolution-prod --yes --no-wait

   # Optionally delete DNS resources (careful!)
   # az group delete --name digitalsponsor --yes --no-wait
   ```

3. **Verify cleanup completion:**
   ```bash
   az group show --name rg-commonsolution-prod --query "properties.provisioningState"
   ```

## 🚀 Step 2: Deploy New Architecture

### Option A: Automated Deployment (Recommended)

1. **Update GitHub Secrets:** Add these secrets to your GitHub repository:

   ```
   AZURE_CREDENTIALS - Service Principal JSON
   AZURE_CLIENT_ID - For Managed Identity
   B2C_TENANT_NAME - Your B2C tenant name
   B2C_CLIENT_ID - B2C application ID
   JWT_SECRET - Secret for JWT signing
   REDIS_URL - Will be auto-generated
   ```

2. **Trigger GitHub Actions deployment:**
   - Go to Actions tab in GitHub
   - Run "Deploy New Architecture" workflow
   - Select environment: `staging` or `production`

### Option B: Manual Deployment

1. **Run the deployment script:**

   ```bash
   ./deploy-new-version.sh
   ```

2. **Build and push Docker images:**

   ```bash
   # Get the ACR name from deployment outputs
   ACR_NAME=$(az deployment group show \
     --resource-group rg-digitalsponsor-new \
     --name your-deployment-name \
     --query "properties.outputs.containerRegistryName.value" \
     --output tsv)

   # Build and push auth service
   az acr build \
     --registry $ACR_NAME \
     --image digitalsponsor-auth:latest \
     --file services/auth/Dockerfile \
     services/auth
   ```

3. **Deploy container apps:**
   ```bash
   # Deploy auth service
   az containerapp create \
     --name ca-digitalsponsor-auth \
     --resource-group rg-digitalsponsor-new \
     --environment cae-digitalsponsor-new \
     --image $ACR_NAME.azurecr.io/digitalsponsor-auth:latest \
     --target-port 3000 \
     --ingress external \
     --min-replicas 1 \
     --max-replicas 5
   ```

## 🌐 Step 3: Update DNS and Domain Configuration

1. **Get new service URLs:**

   ```bash
   AUTH_URL=$(az containerapp show \
     --name ca-digitalsponsor-auth \
     --resource-group rg-digitalsponsor-new \
     --query "properties.configuration.ingress.fqdn" \
     --output tsv)

   echo "Auth Service: https://$AUTH_URL"
   ```

2. **Update DNS records:**

   ```bash
   # Update A record to point to new services
   az network dns record-set a delete \
     --name api \
     --zone-name commonsolution.org \
     --resource-group digitalsponsor \
     --yes

   # Add CNAME record for new auth service
   az network dns record-set cname set-record \
     --zone-name commonsolution.org \
     --resource-group digitalsponsor \
     --record-set-name auth \
     --cname $AUTH_URL
   ```

## 🧪 Step 4: Testing and Validation

1. **Health checks:**

   ```bash
   curl https://your-auth-service-url/health
   curl https://your-auth-service-url/health/ready
   ```

2. **Functional testing:**

   ```bash
   # Test authentication endpoints
   curl -X POST https://your-auth-service-url/auth/login \
     -H "Content-Type: application/json" \
     -d '{"b2cToken": "test-token"}'
   ```

3. **Load testing (optional):**
   ```bash
   npm run test:load -- --url https://your-auth-service-url
   ```

## 🔄 Step 5: Migration Checklist

- [ ] Old deployment cleaned up
- [ ] New infrastructure deployed
- [ ] Authentication service deployed and healthy
- [ ] DNS updated to point to new services
- [ ] SSL certificates configured
- [ ] Environment variables configured
- [ ] Database migrated (if applicable)
- [ ] Redis data migrated (if applicable)
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented

## 🚨 Rollback Plan

If something goes wrong:

1. **Quick DNS rollback:**

   ```bash
   # Revert DNS to old service
   az network dns record-set cname set-record \
     --zone-name commonsolution.org \
     --resource-group digitalsponsor \
     --record-set-name api \
     --cname old-service-url
   ```

2. **Redeploy old version:**
   - Use previous container images
   - Restore database from backup
   - Update environment variables

## 📊 Cost Comparison

**Old Architecture:**

- Container Apps: ~$50/month
- PostgreSQL: ~$100/month
- Redis: ~$30/month
- Static Web Apps: ~$10/month
- **Total: ~$190/month**

**New Architecture:**

- Container Apps Environment: ~$20/month
- Auth Service (Container App): ~$20/month
- Redis Cache: ~$30/month
- Container Registry: ~$5/month
- **Total: ~$75/month** (60% cost reduction)

## 📝 Notes

- The new architecture uses a microservices pattern
- Each service can be scaled independently
- Better security with service isolation
- Easier maintenance and updates
- Built-in AA Traditions compliance
- Comprehensive monitoring and logging

## 🆘 Troubleshooting

### Common Issues:

1. **Container App won't start:**
   - Check environment variables
   - Verify image exists in ACR
   - Check resource limits

2. **DNS not resolving:**
   - Verify DNS propagation (can take 24-48 hours)
   - Check CNAME records
   - Test with nslookup

3. **Authentication failing:**
   - Verify B2C configuration
   - Check JWT secrets
   - Validate Redis connection

### Support:

- Check GitHub Actions logs for deployment issues
- Use Azure Portal for resource monitoring
- Review Container Apps logs for runtime issues

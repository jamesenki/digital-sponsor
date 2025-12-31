# GitHub Actions CI/CD Configuration

This directory contains the complete CI/CD pipeline configuration for Digital Sponsor, implementing
secure automated testing, building, and deployment workflows.

## Workflows

### 🧪 CI Pipeline (`ci.yml`)

**Triggers:** Push to main/develop, Pull Requests  
**Runtime:** ~10-15 minutes

**Jobs:**

1. **Code Quality & Security** - ESLint, Prettier, TypeScript, security audit
2. **Test Suite** - Unit and integration tests across Node.js versions
3. **Build Applications** - Build and validate all workspaces
4. **Security Analysis** - Trivy vulnerability scanning, secret detection

### 🚀 Staging Deployment (`cd-staging.yml`)

**Triggers:** Push to develop branch  
**Runtime:** ~20-30 minutes

**Process:**

1. Build staging artifacts with staging environment variables
2. Deploy frontend to Azure Static Web Apps
3. Build and deploy backend container to Azure Container Apps
4. Run health checks and smoke tests
5. Notify deployment status

**Environment:** https://staging.digitalsponsor.commonsolution.org

### 🌐 Production Deployment (`cd-production.yml`)

**Triggers:** GitHub releases, Manual dispatch  
**Runtime:** ~30-45 minutes

**Process:**

1. Pre-deployment security review with strict vulnerability scanning
2. Build production artifacts
3. Create deployment backup
4. Blue-green deployment to Azure
5. Comprehensive health checks and validation
6. Automatic rollback on failure
7. Performance monitoring and baseline checks

**Environment:** https://digitalsponsor.commonsolution.org

## Security Features

### 🔒 Secret Management

All sensitive information is stored in GitHub Secrets:

```yaml
# Required Secrets:
AZURE_CREDENTIALS_STAGING     # Staging Azure service principal
AZURE_CREDENTIALS_PROD        # Production Azure service principal
AZURE_CONTAINER_REGISTRY      # Container registry name
AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING
AZURE_STATIC_WEB_APPS_API_TOKEN_PROD
```

### 🛡️ Security Scanning

- **Trivy**: Vulnerability scanning for filesystem and dependencies
- **TruffleHog**: Secret detection and validation
- **npm audit**: Dependency security audit
- **Pre-commit hooks**: Code quality enforcement

### 🔐 Branch Protection

Use the provided script to setup branch protection rules:

```bash
# Setup branch protection for current repository
./.github/scripts/setup-branch-protection.sh

# Setup for specific repository
./.github/scripts/setup-branch-protection.sh owner/repo
```

**Protection Rules:**

- **Main Branch**: 2 required approvals, code owner review, linear history
- **Develop Branch**: 1 required approval, status checks required
- **Both Branches**: Force pushes disabled, conversation resolution required

## Dependency Management

### 🤖 Dependabot Configuration

Automated dependency updates configured for:

- npm packages (weekly updates)
- GitHub Actions (weekly updates)
- Docker images (weekly updates)
- Workspace-specific updates

**Update Schedule:** Monday 9:00 AM UTC  
**Review Assignment:** jamesenki  
**PR Limits:** 10 main, 5 per workspace

## Environment Configuration

### 🌍 Environment Variables

**Staging:**

```bash
NODE_ENV=staging
VITE_API_URL=https://api-staging.digitalsponsor.commonsolution.org
```

**Production:**

```bash
NODE_ENV=production
VITE_API_URL=https://api.digitalsponsor.commonsolution.org
```

### 🎯 Deployment Targets

| Environment    | Frontend             | Backend                   | Database       |
| -------------- | -------------------- | ------------------------- | -------------- |
| **Staging**    | Azure SWA Staging    | Container Apps Staging    | Cosmos DB Dev  |
| **Production** | Azure SWA Production | Container Apps Production | Cosmos DB Prod |

## Monitoring & Alerts

### 📊 Health Checks

**Automated Checks:**

- Frontend availability and response time
- API health endpoints
- Database connectivity
- Critical user flows (literature search, crisis support)

**Failure Handling:**

- Automatic rollback for production deployments
- Slack/Teams notifications (configure in secrets)
- Issue creation for persistent failures

### 🚨 Alert Configuration

```yaml
# Add these secrets for notifications:
SLACK_WEBHOOK_URL          # Slack notifications
TEAMS_WEBHOOK_URL          # Microsoft Teams notifications
DISCORD_WEBHOOK_URL        # Discord notifications
```

## Usage Examples

### 🔄 Triggering Deployments

**Staging Deployment:**

```bash
git push origin develop
```

**Production Release:**

```bash
# Create GitHub release
gh release create v1.0.0 --title "Version 1.0.0" --notes "Release notes"

# Manual deployment
gh workflow run "Deploy to Production" --field version=v1.0.0
```

### 🧪 Running Tests Locally

```bash
# Full CI pipeline locally
npm run lint
npm run format:check
npm run type-check
npm run test:unit
npm run test:integration
npm run build

# Specific test suites
npm run test:e2e:staging
npm run test:lighthouse
```

### 🔧 Troubleshooting

**Common Issues:**

1. **Build Failures**: Check TypeScript compilation and dependency conflicts
2. **Test Failures**: Verify environment variables and service availability
3. **Deployment Failures**: Check Azure credentials and resource availability
4. **Security Scan Failures**: Review and address vulnerability findings

**Debug Commands:**

```bash
# Check workflow status
gh run list --workflow=ci.yml

# View specific run logs
gh run view [run-id] --log

# Re-run failed jobs
gh run rerun [run-id] --failed
```

## Best Practices

### 📝 Commit Messages

Follow conventional commits for automated changelog generation:

```bash
feat(chat): add literature citation system
fix(auth): resolve session timeout issue
docs(readme): update installation instructions
ci(github): add security scanning workflow
```

### 🏗️ Workflow Maintenance

**Monthly Tasks:**

- [ ] Review and update dependency versions
- [ ] Audit security scan results
- [ ] Optimize build and test performance
- [ ] Review and clean up old workflow runs

**Quarterly Tasks:**

- [ ] Update GitHub Actions to latest versions
- [ ] Review branch protection rules
- [ ] Audit access permissions and secrets
- [ ] Performance baseline review

---

_This CI/CD configuration implements enterprise-grade practices for secure, automated deployment of
the Digital Sponsor application to Azure infrastructure._

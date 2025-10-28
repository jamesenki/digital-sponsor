# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `digital-sponsor`
3. Description: `AI-powered AA literature companion for those who cannot access traditional sponsorship`
4. Set to **Private** ✅
5. Do NOT initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Add Remote and Push

After creating the repository on GitHub, run these commands:

```bash
# Add the GitHub remote (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/digital-sponsor.git

# Verify the remote was added
git remote -v

# Push the code to GitHub
git push -u origin main
```

## Step 3: Configure Repository Settings

After pushing, go to your repository settings on GitHub:

### Security Settings
1. Go to Settings → Security → Code scanning
2. Enable Dependabot alerts
3. Enable Dependabot security updates
4. Set up CodeQL analysis

### Branch Protection
1. Go to Settings → Branches
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators

### Secrets Setup
Add these secrets in Settings → Secrets and variables → Actions:

```
OPENAI_API_KEY=your-openai-api-key
SENTRY_DSN=your-sentry-dsn
CODECOV_TOKEN=your-codecov-token
```

### GitHub Pages (Optional)
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / docs (for documentation)

## Repository Information

- **Repository**: Private ✅
- **License**: MIT
- **Languages**: TypeScript, Python, JavaScript
- **Topics**: `recovery`, `alcoholics-anonymous`, `ai`, `rag`, `literature`, `privacy`

## Next Steps After Setup

1. Invite collaborators if needed (maintain AA anonymity)
2. Set up issue templates (already included)
3. Configure project boards for task tracking
4. Set up automated security scanning
5. Configure notifications for the team

## Important: AA Traditions Compliance

Remember:
- Keep contributor real names anonymous (use GitHub usernames only)
- No endorsements in repository description or topics
- Focus on service and attraction, not promotion
- Maintain privacy-first approach in all communications
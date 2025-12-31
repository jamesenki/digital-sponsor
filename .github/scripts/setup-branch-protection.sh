#!/bin/bash

# Setup Branch Protection Rules for Digital Sponsor Repository
# This script configures branch protection rules via GitHub CLI

set -e

REPO="${1:-jamesenki/digital-sponsor-investor-demo}"
MAIN_BRANCH="${2:-main}"
DEVELOP_BRANCH="${3:-develop}"

echo "🛡️  Setting up branch protection rules for $REPO"

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Please run 'gh auth login'"
    exit 1
fi

echo "🔒 Configuring protection rules for main branch ($MAIN_BRANCH)..."

# Main branch protection (Production)
gh api repos/$REPO/branches/$MAIN_BRANCH/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks","test","build","security-scan"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"require_last_push_approval":true}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}' \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true \
  --field lock_branch=false || echo "⚠️  Main branch protection may need manual configuration"

echo "🔒 Configuring protection rules for develop branch ($DEVELOP_BRANCH)..."

# Develop branch protection (Staging)
gh api repos/$REPO/branches/$DEVELOP_BRANCH/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks","test","build"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}' \
  --field required_linear_history=false \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true \
  --field lock_branch=false || echo "⚠️  Develop branch protection may need manual configuration"

echo "🏷️  Setting up repository settings..."

# Additional repository settings
gh api repos/$REPO \
  --method PATCH \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=false \
  --field delete_branch_on_merge=true \
  --field allow_auto_merge=true \
  --field allow_update_branch=true \
  --field use_squash_pr_title_as_default=true || echo "⚠️  Repository settings may need manual configuration"

echo "✅ Branch protection setup complete!"
echo ""
echo "📋 Summary:"
echo "  • Main branch ($MAIN_BRANCH): Requires 2 approvals, code owner review, status checks"
echo "  • Develop branch ($DEVELOP_BRANCH): Requires 1 approval, status checks"
echo "  • Force pushes disabled on both branches"
echo "  • Squash merge enabled, merge commits disabled"
echo "  • Auto-delete merged branches enabled"
echo ""
echo "🔍 To verify, visit: https://github.com/$REPO/settings/branches"
#!/bin/bash
# =============================================================================
# Step 4: Commit changes and create PR
# =============================================================================
# This script:
#   1. Stages solution changes
#   2. Commits with a message
#   3. Pushes and creates a PR
#
# Usage: ./4-commit-and-pr.sh "<commit-message>"
# Example: ./4-commit-and-pr.sh "Add approval flow to expense requests"

set -e

COMMIT_MSG=${1:?"Usage: $0 \"<commit-message>\""}

echo "=== Committing and Creating PR ==="
echo ""

# Get current branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" == "main" ]; then
    echo "ERROR: You're on main branch. Create a feature branch first."
    exit 1
fi

# Stage solution changes
echo "[1/3] Staging changes..."
git add ../solutions/

# Show what's being committed
echo ""
echo "Files to commit:"
git diff --cached --stat
echo ""

# Commit
echo "[2/3] Committing..."
git commit -m "$COMMIT_MSG"

# Push and create PR
echo ""
echo "[3/3] Pushing and creating PR..."
git push -u origin "$BRANCH"

# Create PR using gh CLI if available
if command -v gh &> /dev/null; then
    echo ""
    echo "Creating Pull Request..."
    gh pr create \
        --title "$COMMIT_MSG" \
        --body "## Changes

$COMMIT_MSG

## Checklist
- [ ] Solution checker passed
- [ ] Tested in dev environment
- [ ] Ready for managed deployment to Test
" \
        --base main
else
    echo ""
    echo "GitHub CLI not found. Create PR manually at:"
    echo "https://github.com/<your-org>/<your-repo>/pull/new/$BRANCH"
fi

echo ""
echo "=== PR Created ==="
echo "Once approved and merged, CI will build managed solution and deploy to Test"

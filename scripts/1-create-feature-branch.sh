#!/bin/bash
# =============================================================================
# Step 1: Create a feature branch for your changes
# =============================================================================
# Usage: ./1-create-feature-branch.sh <feature-name>
# Example: ./1-create-feature-branch.sh add-approval-flow

set -e

FEATURE_NAME=${1:?"Usage: $0 <feature-name>"}
BRANCH_NAME="feature/$FEATURE_NAME"

echo "Creating feature branch: $BRANCH_NAME"

# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b "$BRANCH_NAME"

echo ""
echo "Feature branch '$BRANCH_NAME' created."
echo "Next step: Run ./2-setup-dev-environment.sh to create a dev environment"

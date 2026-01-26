#!/bin/bash
# =============================================================================
# Step 2: Create/select a dev environment and deploy solution from branch
# =============================================================================
# This script:
#   1. Creates a new dev environment (or uses existing)
#   2. Packs the unpacked solution from the repo
#   3. Imports it as UNMANAGED so you can edit
#
# Usage: ./2-setup-dev-environment.sh <solution-name> [environment-name]
# Example: ./2-setup-dev-environment.sh MySolution dev-feature-approval

set -e

SOLUTION_NAME=${1:?"Usage: $0 <solution-name> [environment-name]"}
ENV_NAME=${2:-"dev-$(whoami)-$(date +%Y%m%d)"}
SOLUTION_DIR="../solutions/$SOLUTION_NAME"

# Check PAC CLI is available
if ! command -v pac &> /dev/null; then
    echo "ERROR: PAC CLI not found. Install it with: dotnet tool install --global Microsoft.PowerApps.CLI.Tool"
    exit 1
fi

echo "=== Power Platform Dev Environment Setup ==="
echo "Solution: $SOLUTION_NAME"
echo "Environment: $ENV_NAME"
echo ""

# Step 1: Check if environment exists, create if not
echo "[1/4] Checking environment..."
if ! pac admin list --filter "$ENV_NAME" 2>/dev/null | grep -q "$ENV_NAME"; then
    echo "Creating new environment: $ENV_NAME"
    pac admin create \
        --name "$ENV_NAME" \
        --type Developer \
        --region "unitedstates" \
        --currency USD \
        --language 1033

    echo "Waiting for environment to be ready..."
    sleep 30
else
    echo "Environment '$ENV_NAME' already exists"
fi

# Step 2: Select the environment
echo ""
echo "[2/4] Selecting environment..."
pac org select --environment "$ENV_NAME"

# Step 3: Pack the solution from unpacked files
echo ""
echo "[3/4] Packing solution from repo..."
if [ ! -d "$SOLUTION_DIR" ]; then
    echo "ERROR: Solution directory not found: $SOLUTION_DIR"
    echo "Make sure you have unpacked solution files in /solutions/$SOLUTION_NAME"
    exit 1
fi

TEMP_ZIP="/tmp/${SOLUTION_NAME}_unmanaged.zip"
pac solution pack \
    --zipfile "$TEMP_ZIP" \
    --folder "$SOLUTION_DIR" \
    --packagetype Unmanaged \
    --allowDelete true \
    --allowWrite true

# Step 4: Import as unmanaged (so you can edit)
echo ""
echo "[4/4] Importing solution as UNMANAGED..."
pac solution import \
    --path "$TEMP_ZIP" \
    --activate-plugins true \
    --force-overwrite true \
    --async true

# Cleanup
rm -f "$TEMP_ZIP"

echo ""
echo "=== Environment Ready ==="
echo "Environment: $ENV_NAME"
echo "Solution '$SOLUTION_NAME' imported as UNMANAGED"
echo ""
echo "You can now:"
echo "  1. Make changes in Power Platform (UI or APIs)"
echo "  2. Use Claude Code to modify solution files directly"
echo "  3. When done, run: ./3-export-changes.sh $SOLUTION_NAME"

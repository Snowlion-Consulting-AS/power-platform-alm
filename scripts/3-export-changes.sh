#!/bin/bash
# =============================================================================
# Step 3: Export changes from environment back to branch
# =============================================================================
# This script:
#   1. Exports the solution from your dev environment
#   2. Unpacks it into the repo (diffable format)
#   3. Shows you what changed (git diff)
#
# Usage: ./3-export-changes.sh <solution-name>
# Example: ./3-export-changes.sh MySolution

set -e

SOLUTION_NAME=${1:?"Usage: $0 <solution-name>"}
SOLUTION_DIR="../solutions/$SOLUTION_NAME"
TEMP_ZIP="/tmp/${SOLUTION_NAME}_export.zip"

echo "=== Exporting Solution Changes ==="
echo "Solution: $SOLUTION_NAME"
echo ""

# Step 1: Export solution from current environment
echo "[1/3] Exporting solution from environment..."
pac solution export \
    --name "$SOLUTION_NAME" \
    --path "$TEMP_ZIP" \
    --managed false \
    --include general

# Step 2: Unpack into repo format
echo ""
echo "[2/3] Unpacking to repo format..."

# Backup current unpacked files (in case of issues)
if [ -d "$SOLUTION_DIR" ]; then
    BACKUP_DIR="/tmp/${SOLUTION_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r "$SOLUTION_DIR" "$BACKUP_DIR"
    echo "Backed up existing files to: $BACKUP_DIR"
fi

# Unpack (overwrites existing)
pac solution unpack \
    --zipfile "$TEMP_ZIP" \
    --folder "$SOLUTION_DIR" \
    --packagetype Unmanaged \
    --allowDelete true \
    --allowWrite true \
    --processCanvasApps true

# Cleanup temp files
rm -f "$TEMP_ZIP"

# Step 3: Show what changed
echo ""
echo "[3/3] Changes detected:"
echo "----------------------------------------"
cd "$(dirname "$SOLUTION_DIR")"
git status --short "../solutions/$SOLUTION_NAME"
echo "----------------------------------------"
echo ""
echo "To see detailed diff: git diff ../solutions/$SOLUTION_NAME"
echo ""
echo "Next step: Run ./4-commit-and-pr.sh to commit changes and create PR"

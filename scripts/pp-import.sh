#!/bin/bash
# Pack and import a Power Platform solution
# Usage: ./pp-import.sh <solution-folder> [--publish]

set -e

SOLUTION_FOLDER="${1:?Usage: $0 <solution-folder> [--publish]}"
PUBLISH="${2:-}"
TEMP_ZIP="/tmp/$(basename "$SOLUTION_FOLDER")_import.zip"

echo "Importing solution from: $SOLUTION_FOLDER"
echo ""

# Pack
echo "[1/3] Packing solution..."
pac solution pack \
    --folder "$SOLUTION_FOLDER" \
    --zipfile "$TEMP_ZIP" \
    --packagetype Unmanaged

# Import
echo ""
echo "[2/3] Importing to environment..."
pac solution import \
    --path "$TEMP_ZIP" \
    --force-overwrite true

rm -f "$TEMP_ZIP"

# Publish if requested
if [ "$PUBLISH" = "--publish" ]; then
    echo ""
    echo "[3/3] Publishing customizations..."
    pac solution publish
    echo ""
    echo "Done. Solution imported and published."
else
    echo ""
    echo "Done. Solution imported."
    echo "Run 'pac solution publish' to publish changes."
fi

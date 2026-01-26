#!/bin/bash
# Export and unpack a Power Platform solution
# Usage: ./pp-export.sh <solution-name> [output-folder]

set -e

SOLUTION_NAME="${1:?Usage: $0 <solution-name> [output-folder]}"
OUTPUT_FOLDER="${2:-../solutions/$SOLUTION_NAME}"
TEMP_ZIP="/tmp/${SOLUTION_NAME}_export.zip"

echo "Exporting solution: $SOLUTION_NAME"
echo "Output folder: $OUTPUT_FOLDER"
echo ""

# Export
echo "[1/2] Exporting from environment..."
pac solution export \
    --name "$SOLUTION_NAME" \
    --path "$TEMP_ZIP" \
    --managed false

# Unpack
echo ""
echo "[2/2] Unpacking to folder..."
pac solution unpack \
    --zipfile "$TEMP_ZIP" \
    --folder "$OUTPUT_FOLDER" \
    --allowWrite true \
    --allowDelete true

rm -f "$TEMP_ZIP"

echo ""
echo "Done. Solution unpacked to: $OUTPUT_FOLDER"

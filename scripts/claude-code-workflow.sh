#!/bin/bash
# =============================================================================
# Claude Code Direct Edit Workflow
# =============================================================================
# This script sets up the workflow where Claude Code can directly modify
# solution files in the repo WITHOUT needing to export from an environment.
#
# TWO APPROACHES:
#
# APPROACH A: Edit unpacked files directly (recommended for Claude Code)
#   - Claude modifies XML/JSON files in /solutions/<name>/
#   - Pack and import to test environment
#   - Faster iteration, fully in Git
#
# APPROACH B: Edit in environment, then export
#   - Traditional approach: make changes in Power Platform UI
#   - Export/unpack to branch
#   - Better for UI-heavy changes (Canvas apps, flows)
#
# This script supports APPROACH A
# =============================================================================

set -e

ACTION=${1:-"help"}
SOLUTION_NAME=${2:-""}

show_help() {
    echo "Claude Code Power Platform Workflow"
    echo ""
    echo "Usage: $0 <action> <solution-name>"
    echo ""
    echo "Actions:"
    echo "  validate   - Validate solution files (syntax check)"
    echo "  test       - Pack and import to test environment"
    echo "  list       - List components in solution"
    echo "  help       - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 validate MySolution"
    echo "  $0 test MySolution"
    echo "  $0 list MySolution"
}

validate_solution() {
    local sol_dir="../solutions/$SOLUTION_NAME"

    if [ ! -d "$sol_dir" ]; then
        echo "ERROR: Solution not found: $sol_dir"
        exit 1
    fi

    echo "Validating solution: $SOLUTION_NAME"
    echo ""

    # Check solution.xml exists
    if [ ! -f "$sol_dir/Other/Solution.xml" ]; then
        echo "ERROR: Solution.xml not found"
        exit 1
    fi
    echo "[OK] Solution.xml exists"

    # Try to pack (validates structure)
    echo "Packing solution to validate structure..."
    TEMP_ZIP="/tmp/${SOLUTION_NAME}_validate.zip"
    if pac solution pack --zipfile "$TEMP_ZIP" --folder "$sol_dir" --packagetype Unmanaged 2>&1; then
        echo "[OK] Solution packs successfully"
        rm -f "$TEMP_ZIP"
    else
        echo "[FAIL] Solution has structural errors"
        exit 1
    fi

    # Run solution checker if authenticated
    echo ""
    echo "Running solution checker..."
    pac solution check --path "$TEMP_ZIP" 2>/dev/null || echo "(Solution checker requires auth - skipped)"

    echo ""
    echo "Validation complete"
}

test_in_environment() {
    local sol_dir="../solutions/$SOLUTION_NAME"

    echo "Testing solution in current environment: $SOLUTION_NAME"
    echo ""

    # Pack
    echo "[1/2] Packing solution..."
    TEMP_ZIP="/tmp/${SOLUTION_NAME}_test.zip"
    pac solution pack \
        --zipfile "$TEMP_ZIP" \
        --folder "$sol_dir" \
        --packagetype Unmanaged

    # Import
    echo ""
    echo "[2/2] Importing to current environment..."
    pac solution import \
        --path "$TEMP_ZIP" \
        --force-overwrite true \
        --activate-plugins true

    rm -f "$TEMP_ZIP"

    echo ""
    echo "Solution imported. Test your changes in the environment."
}

list_components() {
    local sol_dir="../solutions/$SOLUTION_NAME"

    echo "Components in $SOLUTION_NAME:"
    echo ""

    # List entities/tables
    if [ -d "$sol_dir/Entities" ]; then
        echo "Tables:"
        ls "$sol_dir/Entities" 2>/dev/null | sed 's/^/  - /'
        echo ""
    fi

    # List workflows/flows
    if [ -d "$sol_dir/Workflows" ]; then
        echo "Workflows/Flows:"
        ls "$sol_dir/Workflows" 2>/dev/null | sed 's/^/  - /'
        echo ""
    fi

    # List Canvas apps
    if [ -d "$sol_dir/CanvasApps" ]; then
        echo "Canvas Apps:"
        ls "$sol_dir/CanvasApps" 2>/dev/null | sed 's/^/  - /'
        echo ""
    fi

    # List Web resources
    if [ -d "$sol_dir/WebResources" ]; then
        echo "Web Resources:"
        ls "$sol_dir/WebResources" 2>/dev/null | sed 's/^/  - /'
        echo ""
    fi

    # List Plugins
    if [ -d "$sol_dir/PluginAssemblies" ]; then
        echo "Plugin Assemblies:"
        ls "$sol_dir/PluginAssemblies" 2>/dev/null | sed 's/^/  - /'
        echo ""
    fi
}

case $ACTION in
    validate)
        [ -z "$SOLUTION_NAME" ] && { echo "ERROR: Solution name required"; exit 1; }
        validate_solution
        ;;
    test)
        [ -z "$SOLUTION_NAME" ] && { echo "ERROR: Solution name required"; exit 1; }
        test_in_environment
        ;;
    list)
        [ -z "$SOLUTION_NAME" ] && { echo "ERROR: Solution name required"; exit 1; }
        list_components
        ;;
    help|*)
        show_help
        ;;
esac

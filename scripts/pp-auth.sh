#!/bin/bash
# Power Platform authentication helper
# Usage: ./pp-auth.sh [list|create|select <index>|who]

set -e

ACTION="${1:-list}"
INDEX="${2:-}"

case "$ACTION" in
    list)
        echo "Auth profiles:"
        pac auth list
        ;;
    create)
        echo "Creating new auth profile (browser will open)..."
        pac auth create
        ;;
    select)
        if [ -z "$INDEX" ]; then
            echo "Usage: $0 select <index>"
            echo ""
            pac auth list
            exit 1
        fi
        pac auth select --index "$INDEX"
        pac org who
        ;;
    who)
        pac org who
        ;;
    *)
        echo "Usage: $0 [list|create|select <index>|who]"
        echo ""
        echo "Commands:"
        echo "  list              - List all auth profiles"
        echo "  create            - Create new auth profile"
        echo "  select <index>    - Switch to auth profile by index"
        echo "  who               - Show current connection"
        ;;
esac

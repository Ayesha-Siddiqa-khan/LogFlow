#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Stopping and removing LogFlow containers..."
docker compose -f "$SCRIPT_DIR/../docker-compose.yml" down -v --remove-orphans

echo "LogFlow containers stopped and cleaned up."

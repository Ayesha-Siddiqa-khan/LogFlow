#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Starting LogFlow containers..."
docker compose -f "$SCRIPT_DIR/../docker-compose.yml" up -d --build

echo ""
echo "Checking container status:"
docker compose -f "$SCRIPT_DIR/../docker-compose.yml" ps

echo ""
echo "LogFlow is running! Open dashboard at http://localhost:3000"

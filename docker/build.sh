#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAG="${1:-latest}"

echo "Building LogFlow Docker images with tag '$TAG'..."

services=("payments-api" "web-api" "worker" "dashboard")
contexts=(
  "$SCRIPT_DIR/../services/payments-api"
  "$SCRIPT_DIR/../services/web-api"
  "$SCRIPT_DIR/../services/worker"
  "$SCRIPT_DIR/../dashboard"
)

for i in "${!services[@]}"; do
  svc="${services[$i]}"
  ctx="${contexts[$i]}"
  echo ""
  echo "---> Building logflow-$svc:$TAG..."
  docker build -t "logflow-$svc:$TAG" -t "logflow-$svc:latest" "$ctx"
done

echo ""
echo "All LogFlow images built successfully!"
docker images | grep logflow- || true

#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="${1:-$SCRIPT_DIR/k8s.yaml}"

echo "Deploying LogFlow to Kubernetes..."
kubectl apply -f "$MANIFEST"

echo "Waiting for rollout status..."
kubectl rollout status deployment/dashboard -n logflow --timeout=120s
kubectl rollout status deployment/payments-api -n logflow --timeout=120s
kubectl rollout status deployment/web-api -n logflow --timeout=120s
kubectl rollout status deployment/worker -n logflow --timeout=120s

echo "LogFlow Kubernetes deployment complete!"
echo "Access dashboard with: kubectl port-forward svc/dashboard 3000:3000 -n logflow"

#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="${1:-$SCRIPT_DIR/k8s.yaml}"

echo "Tearing down LogFlow from Kubernetes..."
kubectl delete -f "$MANIFEST" --ignore-not-found=true

echo "LogFlow resources deleted from Kubernetes."

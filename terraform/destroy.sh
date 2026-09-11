#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FORCE=false
if [[ "$1" == "--force" || "$1" == "-f" || "$1" == "-y" ]]; then
  FORCE=true
fi

echo "=============================================="
echo "   LogFlow Terraform Resource Teardown"
echo "=============================================="

if [ "$FORCE" = false ]; then
  echo ""
  echo "WARNING: This will permanently destroy all LogFlow AWS resources!"
  read -p "Type 'destroy' to confirm resource deletion: " confirm
  if [ "$confirm" != "destroy" ]; then
    echo "Destruction cancelled."
    exit 0
  fi
fi

echo ""
echo "Destroying LogFlow AWS infrastructure..."
terraform destroy -auto-approve

echo ""
echo "All LogFlow AWS resources have been successfully destroyed."

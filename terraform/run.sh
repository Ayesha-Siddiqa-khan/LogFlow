#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

AUTO_APPROVE=false
if [[ "$1" == "--auto-approve" || "$1" == "-y" ]]; then
  AUTO_APPROVE=true
fi

echo "=============================================="
echo "   LogFlow Terraform Infrastructure Runner"
echo "=============================================="

echo ""
echo "[1/4] Initializing Terraform..."
terraform init

echo ""
echo "[2/4] Validating Terraform configuration..."
terraform validate

echo ""
echo "[3/4] Generating Terraform execution plan..."
terraform plan -out=tfplan

echo ""
echo "[4/4] Applying Terraform plan..."
if [ "$AUTO_APPROVE" = true ]; then
  terraform apply tfplan
else
  read -p "Do you want to apply this plan to AWS? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    terraform apply tfplan
  else
    echo "Terraform apply cancelled."
    rm -f tfplan
    exit 0
  fi
fi

rm -f tfplan

echo ""
echo "Terraform infrastructure provisioned successfully!"
echo ""
echo "Terraform Outputs:"
terraform output

<#
.SYNOPSIS
  Initialize, plan, and apply Terraform infrastructure for LogFlow
.DESCRIPTION
  Safely provisions LogFlow AWS resources (VPC, Subnets, Security Groups, ECR, CloudWatch, IAM).
#>
param(
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   LogFlow Terraform Infrastructure Runner" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "`n[1/4] Initializing Terraform..." -ForegroundColor Yellow
terraform init

Write-Host "`n[2/4] Validating Terraform configuration..." -ForegroundColor Yellow
terraform validate

Write-Host "`n[3/4] Generating Terraform execution plan..." -ForegroundColor Yellow
terraform plan -out=tfplan

Write-Host "`n[4/4] Applying Terraform plan..." -ForegroundColor Yellow
if ($AutoApprove) {
  terraform apply tfplan
} else {
  $confirm = Read-Host "Do you want to apply this plan to AWS? (yes/no)"
  if ($confirm -eq "yes") {
    terraform apply tfplan
  } else {
    Write-Host "Terraform apply cancelled." -ForegroundColor Red
    Remove-Item -Path "tfplan" -ErrorAction SilentlyContinue
    exit 0
  }
}

Remove-Item -Path "tfplan" -ErrorAction SilentlyContinue

Write-Host "`nTerraform infrastructure provisioned successfully!" -ForegroundColor Green
Write-Host "`nTerraform Outputs:" -ForegroundColor Cyan
terraform output

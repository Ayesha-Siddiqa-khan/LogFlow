<#
.SYNOPSIS
  Destroy and clean up LogFlow AWS resources managed by Terraform
.DESCRIPTION
  Safely tears down VPC, subnets, security groups, ECR repositories, and CloudWatch logs.
#>
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Red
Write-Host "   LogFlow Terraform Resource Teardown" -ForegroundColor Red
Write-Host "==============================================" -ForegroundColor Red

Set-Location $PSScriptRoot

if (-not $Force) {
  Write-Host "`nWARNING: This will permanently destroy all LogFlow AWS resources!" -ForegroundColor Yellow
  $confirm = Read-Host "Type 'destroy' to confirm resource deletion"
  if ($confirm -ne "destroy") {
    Write-Host "Destruction cancelled." -ForegroundColor Green
    exit 0
  }
}

Write-Host "`nDestroying LogFlow AWS infrastructure..." -ForegroundColor Red
terraform destroy -auto-approve

Write-Host "`nAll LogFlow AWS resources have been successfully destroyed." -ForegroundColor Green

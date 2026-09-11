<#
.SYNOPSIS
  Destroy/Delete LogFlow from Kubernetes
#>
param(
  [string]$Manifest = "$PSScriptRoot\k8s.yaml"
)

Write-Host "Tearing down LogFlow from Kubernetes..." -ForegroundColor Yellow
kubectl delete -f $Manifest --ignore-not-found=true

Write-Host "LogFlow resources deleted from Kubernetes." -ForegroundColor Green

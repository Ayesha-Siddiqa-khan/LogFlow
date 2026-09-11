<#
.SYNOPSIS
  Deploy LogFlow to Kubernetes
#>
param(
  [string]$Manifest = "$PSScriptRoot\k8s.yaml"
)

Write-Host "Deploying LogFlow to Kubernetes..." -ForegroundColor Cyan
kubectl apply -f $Manifest

Write-Host "`nWaiting for rollout status..." -ForegroundColor Yellow
kubectl rollout status deployment/dashboard -n logflow --timeout=120s
kubectl rollout status deployment/payments-api -n logflow --timeout=120s
kubectl rollout status deployment/web-api -n logflow --timeout=120s
kubectl rollout status deployment/worker -n logflow --timeout=120s

Write-Host "`nLogFlow Kubernetes deployment complete!" -ForegroundColor Green
Write-Host "Access dashboard with: kubectl port-forward svc/dashboard 3000:3000 -n logflow" -ForegroundColor Cyan

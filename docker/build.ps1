<#
.SYNOPSIS
  Build all LogFlow Docker images
#>
param(
  [string]$Tag = "latest"
)

Write-Host "Building LogFlow Docker images..." -ForegroundColor Cyan

$services = @(
  @{ Name = "payments-api"; Context = "$PSScriptRoot\..\services\payments-api" },
  @{ Name = "web-api";      Context = "$PSScriptRoot\..\services\web-api" },
  @{ Name = "worker";       Context = "$PSScriptRoot\..\services\worker" },
  @{ Name = "dashboard";    Context = "$PSScriptRoot\..\dashboard" }
)

foreach ($svc in $services) {
  Write-Host "`n---> Building logflow-$($svc.Name):$Tag..." -ForegroundColor Yellow
  docker build -t "logflow-$($svc.Name):$Tag" -t "logflow-$($svc.Name):latest" $svc.Context
}

Write-Host "`nAll LogFlow images built successfully!" -ForegroundColor Green
docker images | Select-String "logflow-"

<#
.SYNOPSIS
  LogFlow Failure Simulation Script (PowerShell)
.DESCRIPTION
  Allows developers to simulate failure scenarios described in PRD Section 17.
.PARAMETER Scenario
  1: Service Failure (payments-api crash/unhealthy)
  2: Application Error (web-api error storm)
  3: Degraded Worker (worker queue slowdown)
  reset: Restore all services to healthy
#>

param (
  [Parameter(Mandatory=$true)]
  [ValidateSet("1", "2", "3", "reset")]
  [string]$Scenario,

  [string]$BaseHost = "localhost"
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   LogFlow Failure Simulation Engine" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

switch ($Scenario) {
  "1" {
    Write-Host "[Scenario 1] Triggering Payments API Failure..." -ForegroundColor Yellow
    try {
      $resp = Invoke-RestMethod -Uri "http://${BaseHost}:3001/simulate-crash" -Method Post -Body '{"exit": false}' -ContentType "application/json"
      Write-Host "Response:" ($resp | ConvertTo-Json -Compress) -ForegroundColor Red
      Write-Host "Action Required: Check LogFlow Dashboard (http://${BaseHost}:3000) or run 'kubectl get pods -n logflow'" -ForegroundColor Gray
    } catch {
      Write-Host "Failed to reach payments-api at http://${BaseHost}:3001" -ForegroundColor Red
    }
  }

  "2" {
    Write-Host "[Scenario 2] Inducing Application Error Storm on Web API..." -ForegroundColor Yellow
    for ($i = 1; $i -le 5; $i++) {
      try {
        $resp = Invoke-RestMethod -Uri "http://${BaseHost}:3002/simulate-error" -Method Post -Body '{"message": "Database connection pool exhausted"}' -ContentType "application/json" -ErrorAction SilentlyContinue
      } catch {
        Write-Host "  Error generated ($i/5)" -ForegroundColor Red
      }
    }
    Write-Host "Action Required: Inspect centralized logs on Dashboard (http://${BaseHost}:3000) for ERROR level entries" -ForegroundColor Gray
  }

  "3" {
    Write-Host "[Scenario 3] Degrading Worker Processing Speed..." -ForegroundColor Yellow
    try {
      $resp = Invoke-RestMethod -Uri "http://${BaseHost}:3003/simulate-degraded" -Method Post -ContentType "application/json"
      Write-Host "Response:" ($resp | ConvertTo-Json -Compress) -ForegroundColor Yellow
      Write-Host "Action Required: Check Dashboard status card for worker 'DEGRADED' and WARN log entries" -ForegroundColor Gray
    } catch {
      Write-Host "Failed to reach worker at http://${BaseHost}:3003" -ForegroundColor Red
    }
  }

  "reset" {
    Write-Host "[Reset] Restoring all services to healthy operation..." -ForegroundColor Green
    try { Invoke-RestMethod -Uri "http://${BaseHost}:3001/reset" -Method Post -ErrorAction SilentlyContinue } catch {}
    try { Invoke-RestMethod -Uri "http://${BaseHost}:3002/reset" -Method Post -ErrorAction SilentlyContinue } catch {}
    try { Invoke-RestMethod -Uri "http://${BaseHost}:3003/reset" -Method Post -ErrorAction SilentlyContinue } catch {}
    Write-Host "All services reset! Cluster is back to HEALTHY." -ForegroundColor Green
  }
}

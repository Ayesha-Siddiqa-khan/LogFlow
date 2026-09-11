<#
.SYNOPSIS
  Start LogFlow services with Docker Compose
#>
Write-Host "Starting LogFlow containers..." -ForegroundColor Cyan
docker compose -f "$PSScriptRoot\..\docker-compose.yml" up -d --build

Write-Host "`nChecking container status:" -ForegroundColor Yellow
docker compose -f "$PSScriptRoot\..\docker-compose.yml" ps

Write-Host "`nLogFlow is running! Open dashboard at http://localhost:3000" -ForegroundColor Green

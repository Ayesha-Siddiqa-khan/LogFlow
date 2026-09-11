<#
.SYNOPSIS
  Stop and remove LogFlow containers
#>
Write-Host "Stopping and removing LogFlow containers..." -ForegroundColor Yellow
docker compose -f "$PSScriptRoot\..\docker-compose.yml" down -v --remove-orphans

Write-Host "LogFlow containers stopped and cleaned up." -ForegroundColor Green

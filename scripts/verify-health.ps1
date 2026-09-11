param (
  [string]$BaseHost = "localhost"
)

Write-Host "Verifying LogFlow Service Health..." -ForegroundColor Cyan

$services = @(
  @{ Name = "Dashboard"; Port = 3000 },
  @{ Name = "Payments API"; Port = 3001 },
  @{ Name = "Web API"; Port = 3002 },
  @{ Name = "Worker"; Port = 3003 }
)

foreach ($svc in $services) {
  $url = "http://${BaseHost}:$($svc.Port)/health"
  try {
    $res = Invoke-RestMethod -Uri $url -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ $($svc.Name) (port $($svc.Port)): $($res.status)" -ForegroundColor Green
  } catch {
    Write-Host "✗ $($svc.Name) (port $($svc.Port)): UNREACHABLE or UNHEALTHY" -ForegroundColor Red
  }
}

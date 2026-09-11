#!/bin/bash
HOST="${1:-localhost}"

echo "Verifying LogFlow Service Health..."

ports=(3000 3001 3002 3003)
names=("Dashboard" "Payments API" "Web API" "Worker")

for i in "${!ports[@]}"; do
  port="${ports[$i]}"
  name="${names[$i]}"
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://${HOST}:${port}/health" || echo "000")
  if [ "$code" -eq 200 ]; then
    echo "✓ ${name} (port ${port}): HEALTHY"
  else
    echo "✗ ${name} (port ${port}): HTTP ${code} (UNHEALTHY / DOWN)"
  fi
done

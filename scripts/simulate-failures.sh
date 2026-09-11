#!/bin/bash
# LogFlow Failure Simulation Script (Bash)
# Usage: ./scripts/simulate-failures.sh [1|2|3|reset] [host]

SCENARIO="${1:-}"
HOST="${2:-localhost}"

if [[ -z "$SCENARIO" ]]; then
  echo "Usage: $0 <1|2|3|reset> [host]"
  echo "  1     : Simulate Payments API Failure"
  echo "  2     : Simulate Web API Error Storm"
  echo "  3     : Simulate Worker Degradation"
  echo "  reset : Restore all services to healthy"
  exit 1
fi

case "$SCENARIO" in
  "1")
    echo "[Scenario 1] Triggering Payments API Failure..."
    curl -s -X POST "http://${HOST}:3001/simulate-crash" -H "Content-Type: application/json" -d '{"exit": false}'
    echo ""
    echo "Check dashboard at http://${HOST}:3000 to observe degraded status."
    ;;
  "2")
    echo "[Scenario 2] Inducing Web API Error Storm..."
    for i in {1..5}; do
      curl -s -X POST "http://${HOST}:3002/simulate-error" -H "Content-Type: application/json" -d '{"message": "Database lock contention"}' > /dev/null
      echo "  Error generated ($i/5)"
    done
    echo "Check dashboard at http://${HOST}:3000 for ERROR entries."
    ;;
  "3")
    echo "[Scenario 3] Degrading Worker Processing Speed..."
    curl -s -X POST "http://${HOST}:3003/simulate-degraded" -H "Content-Type: application/json"
    echo ""
    echo "Check dashboard at http://${HOST}:3000 for WARN entries and DEGRADED state."
    ;;
  "reset")
    echo "[Reset] Restoring all services..."
    curl -s -X POST "http://${HOST}:3001/reset" > /dev/null || true
    curl -s -X POST "http://${HOST}:3002/reset" > /dev/null || true
    curl -s -X POST "http://${HOST}:3003/reset" > /dev/null || true
    echo "All services restored to normal healthy operation."
    ;;
  *)
    echo "Unknown scenario: $SCENARIO"
    exit 1
    ;;
esac

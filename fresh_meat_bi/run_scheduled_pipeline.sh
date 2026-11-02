#!/bin/bash
# Fresh Meat Retail BI — Scheduled Pipeline & Recovery Runner
# Runs the scheduler diagnosis & recovery check, updates intelligence manifest.
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"

echo "=== Running Fresh Meat Retail BI Scheduled Check ==="
python3 "$DIR/promo_weekly_scheduler.py" --check-and-recover
python3 "$DIR/update_market_intelligence_manifest.py"
echo "=== Scheduled Check Completed ==="

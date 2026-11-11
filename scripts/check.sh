#!/usr/bin/env bash
# Runs every automated check (docs/CONVENTIONS.md section 6). Exits non-zero on any failure.
# CHECK_NO_COVERAGE=1 skips only the coverage thresholds (empty-skeleton smoke check).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run --silent lint
npm run --silent format:check
npm run --silent typecheck
npm run --silent deps
if [[ "${CHECK_NO_COVERAGE:-}" == "1" ]]; then
  npm run --silent test:nocov
else
  npm run --silent test
fi
if [[ "${1:-}" == "--e2e" ]]; then npm run --silent test:e2e; fi
echo "check.sh: all checks passed"

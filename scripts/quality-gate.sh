#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[QUALITY] Starting quality gate..."

echo "[QUALITY] FE -> quality:gate"
cd "$ROOT_DIR/FE"
npm run quality:gate

echo "[QUALITY] BE -> quality:gate"
cd "$ROOT_DIR/be"
npm run quality:gate

echo "[QUALITY] PASSED"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Starting Bun sidecar dev server and host (DEV mode)..."
(
  cd bun-sidecar
  bun install
  bun run dev
) &

sleep 1

export BUN_DEV_SERVER_URL="http://127.0.0.1:4444"
./scripts/build_host_app.sh --run


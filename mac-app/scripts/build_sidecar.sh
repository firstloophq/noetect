#!/usr/bin/env bash
set -euo pipefail

echo "[sidecar] === BUILD SIDECAR DEBUG ==="
echo "[sidecar] Script location: $0"
echo "[sidecar] Current directory: $(pwd)"

# Navigate to the script directory and then up one level to mac-app
cd "$(dirname "$0")/.."
echo "[sidecar] Changed to mac-app directory: $(pwd)"

# Now go up one more level to the project root where bun-sidecar is located
cd ..
echo "[sidecar] Changed to project root: $(pwd)"
echo "[sidecar] Contents of project root:"
ls -la

BUN_SIDECAR_DIR="bun-sidecar"

if [ ! -d "$BUN_SIDECAR_DIR" ]; then
  echo "[sidecar] ERROR: $BUN_SIDECAR_DIR directory not found in $(pwd)" >&2
  echo "[sidecar] ERROR: Expected path: $(pwd)/$BUN_SIDECAR_DIR" >&2
  exit 1
fi

# Create build directory in mac-app
mkdir -p mac-app/build/sidecar
echo "[sidecar] Created build directory: mac-app/build/sidecar"

if ! command -v bun >/dev/null 2>&1; then
  echo "[sidecar] ERROR: bun not found. Install bun: https://bun.sh" >&2
  exit 1
fi

echo "[sidecar] building Tailwind CSS..."
pushd "$BUN_SIDECAR_DIR" >/dev/null
bun x tailwindcss -i ./src/input.css -o ./src/output.css
popd >/dev/null
echo "[sidecar] Tailwind CSS build completed"

echo "[sidecar] compiling server with direct HTML imports to single binary..."
bun build "$BUN_SIDECAR_DIR/src/server.ts" --compile --target=bun --define "process.env.NODE_ENV='production'" --outfile mac-app/build/sidecar/sidecar

echo "[sidecar] done: mac-app/build/sidecar/sidecar"


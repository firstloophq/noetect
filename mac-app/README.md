## How It Works

1) App launch (Swift host)
- On startup, the host picks an available `PORT`, launches the sidecar process, and waits for `/health` to return 200.
- When ready, it creates a `WKWebView` window pointing at `http://127.0.0.1:PORT/`.
- A menu bar icon is installed with Open/Hide + Quit. A global hotkey ⌘⇧B toggles the window.

2) Sidecar (Bun)
- `sidecar/server.ts` uses `Bun.serve` with direct HTML imports to:
  - serve React app with automatic bundling
  - serve backend API
- Tailwind CSS is compiled using standalone CLI during build
4) Dev mode
- If `BUN_DEV_SERVER_URL` is set (e.g. `http://localhost:4444  `), the host skips launching the sidecar and points `WKWebView` directly to your Vite dev server for instant reload.

---

## Directory Layout
```
bun-macos-sidecar-starter/
  macos-host/
    Sources/                # Swift AppKit host
    Info.plist              # App settings + ATS allow localhost
    entitlements.plist      # JIT + network client (adjust for prod)
    Resources/              # status bar icon, etc.
  bun-sidecar/
    server.ts               # Bun server (HTTP + WS)
  scripts/                  # Build and package scripts
  bundle/                   # Output .app goes here
  Makefile
```

---

## Tailwind CSS Setup

This project uses **Tailwind CSS with standalone CLI** for styling, integrated into the build process:

### How it works:
1. **Input CSS**: `bun-sidecar/src/input.css` contains Tailwind directives and custom styles
2. **Compilation**: During build, Tailwind CLI processes the input and generates `bun-sidecar/src/output.css`
3. **HTML Import**: The compiled CSS is linked directly in `bun-sidecar/src/index.html`
4. **Direct serving**: Bun serves the HTML with automatic React/TypeScript bundling

### Key files:
- `bun-sidecar/src/input.css` - Tailwind input with `@import "tailwindcss"` and custom styles
- `bun-sidecar/src/output.css` - Generated CSS (auto-created during build)
- `bun-sidecar/src/index.html` - Links to `output.css`
- Build process runs: `bun x tailwindcss -i ./src/input.css -o ./src/output.css`

### Manual CSS rebuild (if needed):
```bash
cd bun-sidecar
bun x tailwindcss -i ./src/input.css -o ./src/output.css
```

---

## Build & Run

Requirements: Xcode command line tools, Bun ≥ 1.1, macOS 12+

Build everything:
```
make build
open bundle/BunSidecar.app
```


Common Commands:
- `make build` — Build Tailwind CSS, sidecar, host, assemble the .app
- `make run-host` — Build and run host only (uses `BUN_DEV_SERVER_URL` if set)
- `make build-sidecar|build-host` — Targeted builds
- `make zip` — Produce `bun-macos-sidecar-starter.zip`

---
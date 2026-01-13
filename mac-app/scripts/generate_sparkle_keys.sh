#!/usr/bin/env bash
# Generates EdDSA signing keys for Sparkle updates
# Run this ONCE and store the private key securely
set -euo pipefail
cd "$(dirname "$0")/.."

SPARKLE_DIR="Frameworks/Sparkle"
GENERATE_KEYS="$SPARKLE_DIR/bin/generate_keys"

# Ensure Sparkle is downloaded
./scripts/download_sparkle.sh

if [[ ! -f "$GENERATE_KEYS" ]]; then
    echo "Error: generate_keys tool not found at $GENERATE_KEYS"
    exit 1
fi

echo "============================================================"
echo "Generating EdDSA Signing Keys for Sparkle"
echo "============================================================"
echo ""
echo "This will generate a new key pair for signing updates."
echo ""
echo "IMPORTANT:"
echo "  - The PRIVATE key will be stored in your macOS Keychain"
echo "  - The PUBLIC key must be added to Info.plist (SUPublicEDKey)"
echo "  - Never share or commit the private key"
echo ""

"$GENERATE_KEYS"

echo ""
echo "============================================================"
echo "Next Steps:"
echo "============================================================"
echo "1. Copy the public key above"
echo "2. Update mac-app/macos-host/Info.plist:"
echo "   Replace YOUR_PUBLIC_EDDSA_KEY_HERE with your public key"
echo ""
echo "The private key is stored in your Keychain under 'Sparkle EdDSA key'"
echo "Back up your Keychain or export the key securely."

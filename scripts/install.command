#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SRC="$SCRIPT_DIR/Liburu.app"
APP_DEST="/Applications/Liburu.app"

echo "Installing Liburu..."
cp -r "$APP_SRC" "$APP_DEST"

echo "Removing quarantine..."
xattr -dr com.apple.quarantine "$APP_DEST"

echo "Launching Liburu..."
open "$APP_DEST"

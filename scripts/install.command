#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SRC="$SCRIPT_DIR/Liburu.app"
APP_DEST="/Applications/Liburu.app"

if [ ! -d "$APP_SRC" ]; then
  echo "ERROR: Liburu.app not found next to this script."
  echo "Make sure you run this from inside the DMG."
  read -p "Press Enter to close..."
  exit 1
fi

echo "Copying Liburu to Applications..."
rm -rf "$APP_DEST"
cp -r "$APP_SRC" "$APP_DEST"

echo "Removing quarantine (you may be asked for your password)..."
osascript -e 'do shell script "xattr -dr com.apple.quarantine /Applications/Liburu.app" with administrator privileges'

echo "Done! Launching Liburu..."
open "$APP_DEST"

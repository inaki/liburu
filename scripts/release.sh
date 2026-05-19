#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
APP_BUNDLE="src-tauri/target/release/bundle/macos/Liburu.app"
DMG_STAGE="/tmp/liburu-dmg-${VERSION}"

VERSIONED_DMG="dist-release/Liburu-macOS-${TAG}.dmg"
VERSIONED_ZIP="dist-release/Liburu-macOS-${TAG}.zip"
GENERIC_DMG="dist-release/Liburu-macOS.dmg"
GENERIC_ZIP="dist-release/Liburu-macOS.zip"

echo "==> Building Liburu ${TAG}..."
npm run tauri build

echo "==> Staging DMG contents..."
rm -rf "$DMG_STAGE"
mkdir -p "$DMG_STAGE"
cp -r "$APP_BUNDLE" "$DMG_STAGE/Liburu.app"
ln -s /Applications "$DMG_STAGE/Applications"

echo "==> Creating DMG..."
mkdir -p dist-release
hdiutil create \
  -volname "Liburu ${TAG}" \
  -srcfolder "$DMG_STAGE" \
  -ov -format UDZO \
  "$VERSIONED_DMG"
cp "$VERSIONED_DMG" "$GENERIC_DMG"

echo "==> Creating ZIP..."
ditto -c -k --sequesterRsrc --keepParent "$APP_BUNDLE" "$VERSIONED_ZIP"
cp "$VERSIONED_ZIP" "$GENERIC_ZIP"

rm -rf "$DMG_STAGE"

echo "==> Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  "${VERSIONED_DMG}#Liburu-macOS-${TAG}.dmg" \
  "${VERSIONED_ZIP}#Liburu-macOS-${TAG}.zip" \
  "${GENERIC_ZIP}#Liburu-macOS.zip" \
  --title "Liburu ${TAG}" \
  --notes "$(cat <<NOTES
## Liburu ${TAG}

### Download
- **DMG:** Liburu-macOS-${TAG}.dmg

### Install on macOS
1. Open the DMG and drag **Liburu.app** to Applications
2. Try to open Liburu — macOS will block it on first launch
3. Open **System Settings → Privacy & Security** and scroll to the bottom
4. Click **Open Anyway** next to Liburu
5. Enter your password — Liburu opens and works normally from then on

> This app is unsigned. The Privacy & Security step is a one-time requirement until we add Apple code signing.
NOTES
)"

echo "==> Done. Release ${TAG} published."
echo "    https://github.com/inaki/liburu/releases/tag/${TAG}"

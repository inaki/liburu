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
cp scripts/install.command "$DMG_STAGE/Install Liburu.command"
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

### Downloads
- **DMG (recommended):** Liburu-macOS-${TAG}.dmg — includes one-click installer
- **ZIP:** Liburu-macOS-${TAG}.zip

### macOS install (DMG)
1. Open the DMG
2. Double-click **Install Liburu.command**
3. Click **Open** when macOS asks to confirm
4. Liburu launches automatically

### macOS install (ZIP)
1. Unzip and move \`Liburu.app\` to Applications
2. Right-click → **Open** on first launch
NOTES
)"

echo "==> Done. Release ${TAG} published."
echo "    https://github.com/inaki/liburu/releases/tag/${TAG}"

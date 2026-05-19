#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
DMG_SRC="src-tauri/target/release/bundle/dmg/Liburu_${VERSION}_aarch64.dmg"
APP_BUNDLE="src-tauri/target/release/bundle/macos/Liburu.app"

VERSIONED_DMG="dist-release/Liburu-macOS-${TAG}.dmg"
VERSIONED_ZIP="dist-release/Liburu-macOS-${TAG}.zip"
GENERIC_ZIP="dist-release/Liburu-macOS.zip"
GENERIC_DMG="dist-release/Liburu-macOS.dmg"

echo "==> Building Liburu ${TAG}..."
npm run tauri build

echo "==> Packaging artifacts..."
mkdir -p dist-release

cp "$DMG_SRC" "$VERSIONED_DMG"
cp "$DMG_SRC" "$GENERIC_DMG"

ditto -c -k --sequesterRsrc --keepParent "$APP_BUNDLE" "$VERSIONED_ZIP"
cp "$VERSIONED_ZIP" "$GENERIC_ZIP"

echo "==> Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  "${VERSIONED_DMG}#Liburu-macOS-${TAG}.dmg" \
  "${VERSIONED_ZIP}#Liburu-macOS-${TAG}.zip" \
  "${GENERIC_ZIP}#Liburu-macOS.zip" \
  --title "Liburu ${TAG}" \
  --notes "$(cat <<NOTES
## Liburu ${TAG}

### Downloads
- **Versioned DMG:** Liburu-macOS-${TAG}.dmg
- **Versioned ZIP:** Liburu-macOS-${TAG}.zip
- **Generic ZIP:** Liburu-macOS.zip (always points to latest)

### macOS first launch
This app is unsigned. On first launch:
1. Move \`Liburu.app\` into Applications
2. Right-click and choose **Open**
3. Confirm the security prompt
NOTES
)"

echo "==> Done. Release ${TAG} published."
echo "    https://github.com/inaki/liburu/releases/tag/${TAG}"

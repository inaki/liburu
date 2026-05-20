#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
APP_BUNDLE="src-tauri/target/release/bundle/macos/Liburu.app"
DMG_STAGE="/tmp/liburu-dmg-${VERSION}"
HOMEBREW_TAP_DIR="/tmp/homebrew-tap-release"

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

### Install via Homebrew (recommended)
\`\`\`
brew install --cask inaki/tap/liburu
\`\`\`

### Manual install
1. Download \`Liburu-macOS-${TAG}.dmg\`
2. Open the DMG and drag **Liburu.app** to Applications
3. Open **System Settings → Privacy & Security** → click **Open Anyway**
NOTES
)"

echo "==> Updating Homebrew cask..."
SHA256=$(shasum -a 256 "$VERSIONED_DMG" | awk '{print $1}')
rm -rf "$HOMEBREW_TAP_DIR"
git clone https://github.com/inaki/homebrew-tap.git "$HOMEBREW_TAP_DIR"
cat > "$HOMEBREW_TAP_DIR/Casks/liburu.rb" <<CASK
cask "liburu" do
  version "${VERSION}"
  sha256 "${SHA256}"

  url "https://github.com/inaki/liburu/releases/download/v#{version}/Liburu-macOS-v#{version}.dmg"
  name "Liburu"
  desc "Lightweight local Markdown project viewer"
  homepage "https://inaki.github.io/liburu/"

  app "Liburu.app"

  zap trash: [
    "~/Library/Application Support/ai.jerni.liburu",
    "~/Library/Preferences/ai.jerni.liburu.plist",
    "~/Library/Saved Application State/ai.jerni.liburu.savedState"
  ]
end
CASK
cd "$HOMEBREW_TAP_DIR"
git add Casks/liburu.rb
git commit -m "Update Liburu cask to ${TAG}"
git push
cd -
rm -rf "$HOMEBREW_TAP_DIR"

echo "==> Done. Release ${TAG} published."
echo "    https://github.com/inaki/liburu/releases/tag/${TAG}"
echo ""
echo "    Install: brew install --cask inaki/tap/liburu"

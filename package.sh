#!/bin/bash
# package.sh — Packages Screenshot TUIF for Chrome Web Store submission

EXTENSION_NAME="screenshot-tuif"
VERSION=$(node -p "require('./manifest.json').version")
OUTPUT="${EXTENSION_NAME}-v${VERSION}.zip"

# Remove old ZIP
rm -f "$OUTPUT"

echo "Packaging $EXTENSION_NAME v$VERSION..."

# Create clean ZIP excluding source control, docs, and build scripts
zip -r "$OUTPUT" . \
  -x ".git/*" \
  -x "CHROMEWEBSTORE.md" \
  -x "README.md" \
  -x "package.sh" \
  -x "*.zip" \
  -x ".DS_Store" \
  -x "Thumbs.db"

echo "✅ Created: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
echo "Ready to upload to Chrome Web Store Developer Dashboard!"

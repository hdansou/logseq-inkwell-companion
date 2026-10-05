#!/bin/sh
# Build the marketplace release zip: dist/logseq-inkwell-companion-<version>.zip, files at the zip root.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
NAME=$(node -p 'require("./package.json").name')
VERSION=$(node -p 'require("./package.json").version')
OUT="dist/$NAME-$VERSION.zip"
npm test --silent >/dev/null
mkdir -p dist
rm -f "$OUT"
zip -q -r "$OUT" package.json index.html src README.md LICENSE CHANGELOG.md assets/icon.png -x '*.DS_Store'
echo "$OUT"

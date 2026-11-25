#!/usr/bin/env bash
# Fetches Chillax 500 and 600 from Fontshare into client/public/fonts/ (M34, F163b).
#
# The ITF Free Font License lets us self-host Chillax for our own app (§01) but not redistribute the
# files through a public repository (§02), and this repository is public. So the woff2 files are
# gitignored: run this once locally, and the deploy workflow runs it before `docker build`. The
# files are copied out of the official kit unchanged (§02 forbids subsetting or conversion).
#
#   scripts/fetch-fonts.sh          # skips the download when both files are already there
set -euo pipefail

cd "$(dirname "$0")/.."
DEST=client/public/fonts
FILES=(Chillax-Medium.woff2 Chillax-Semibold.woff2)
KIT_URL=https://api.fontshare.com/v2/fonts/download/chillax

missing=0
for f in "${FILES[@]}"; do [ -s "$DEST/$f" ] || missing=1; done
[ "$missing" = 0 ] && { echo "fonts: already in $DEST"; exit 0; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fsSL --retry 3 -o "$TMP/chillax.zip" "$KIT_URL"

mkdir -p "$DEST"
for f in "${FILES[@]}"; do
  unzip -j -o -q "$TMP/chillax.zip" "Chillax_Complete/Fonts/WEB/fonts/$f" -d "$TMP/out"
  # A woff2 file starts with the signature "wOF2".
  [ "$(head -c 4 "$TMP/out/$f")" = wOF2 ] || { echo "fonts: $f is not a woff2 file" >&2; exit 1; }
  mv "$TMP/out/$f" "$DEST/$f"
done
echo "fonts: ${FILES[*]} in $DEST"

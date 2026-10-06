#!/bin/sh
# Assembles src/ into index.html (standalone) and dist/pulisci-pupu.html (artifact body, no doctype).
set -e
cd "$(dirname "$0")"
mkdir -p dist
{ cat src/head.html; echo '<script>'; cat src/engine.js src/content.js src/game.js; echo '</script>'; } > dist/pulisci-pupu.html
{ printf '<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'; cat dist/pulisci-pupu.html; printf '</body>\n</html>\n'; } > index.html
echo "built: $(wc -c < index.html) bytes"

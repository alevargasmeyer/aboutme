#!/usr/bin/env bash
# Stamps content-hash query strings on styles.css, site.js, chat.js
# in every HTML file. Run this before `git push` if you changed any
# of those files.
set -e
cd "$(dirname "$0")"
CSS_V=$(md5 -q styles.css | cut -c1-8)
JS_V=$(md5 -q site.js | cut -c1-8)
CHAT_V=$(md5 -q chat.js | cut -c1-8)
echo "css=$CSS_V site=$JS_V chat=$CHAT_V"
for f in index.html gio.html cadena.html consulting.html social.html; do
  sed -i '' "s|styles\.css?v=[a-f0-9]*|styles.css?v=$CSS_V|g" "$f"
  sed -i '' "s|site\.js?v=[a-f0-9]*|site.js?v=$JS_V|g" "$f"
  sed -i '' "s|chat\.js?v=[a-f0-9]*|chat.js?v=$CHAT_V|g" "$f"
done
echo "stamped."

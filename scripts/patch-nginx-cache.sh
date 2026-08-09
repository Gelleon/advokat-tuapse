#!/usr/bin/env bash
# Nginx performance + cache for advokat-tuapse.ru. Safe to run repeatedly.
set -euo pipefail

CACHE_ASSETS='    location ^~ /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }'

CACHE_FONTS='    location ^~ /fonts/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }'

find_site() {
  local candidate
  for candidate in \
    /etc/nginx/sites-available/advokat-tuapse \
    /etc/nginx/sites-available/advokat \
    /etc/nginx/sites-enabled/advokat-tuapse \
    /etc/nginx/sites-enabled/advokat; do
    if [ -f "$candidate" ] && grep -q 'advokat-tuapse\.ru' "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  if [ -d /etc/nginx/sites-available ]; then
    grep -rl 'advokat-tuapse\.ru' /etc/nginx/sites-available 2>/dev/null | head -1
  fi
}

SITE="$(find_site || true)"
if [ -z "${SITE:-}" ] || [ ! -f "$SITE" ]; then
  echo "NGINX_SITE_NOT_FOUND"
  exit 1
fi

echo "NGINX_SITE=$SITE"

# SEO: убрать 301 на trailing slash ($uri/ в try_files)
if grep -qE 'try_files \$uri \$uri/' "$SITE"; then
  sed -i 's|try_files $uri $uri/ /index.html;|rewrite ^(.+)/$ $1 last;\n        try_files $uri/index.html $uri /index.html;|g' "$SITE"
  echo "NGINX_SEO_PATCHED_TRAILING_SLASH"
elif grep -q 'try_files $uri/index.html $uri /index.html' "$SITE"; then
  echo "NGINX_SEO_ALREADY_OK"
else
  echo "NGINX_SEO_MANUAL_REQUIRED"
fi

if ! grep -q 'absolute_redirect off' "$SITE"; then
  sed -i '/ssl_dhparam.*ssl-dhparams/a\
\
    absolute_redirect off;\
    server_name_in_redirect off;' "$SITE"
  echo "NGINX_REDIRECT_HEADERS_PATCHED"
fi

# Gzip (если ещё нет)
if grep -q 'gzip on;' "$SITE"; then
  echo "NGINX_GZIP_ALREADY_OK"
elif grep -q 'client_max_body_size 20m;' "$SITE"; then
  awk '
    { print }
    /client_max_body_size 20m;/ && !gzip_done {
      print ""
      print "    gzip on;"
      print "    gzip_comp_level 5;"
      print "    gzip_min_length 256;"
      print "    gzip_proxied any;"
      print "    gzip_vary on;"
      print "    gzip_types"
      print "        text/plain"
      print "        text/css"
      print "        text/xml"
      print "        text/javascript"
      print "        application/javascript"
      print "        application/x-javascript"
      print "        application/json"
      print "        application/xml"
      print "        image/svg+xml"
      print "        font/woff2;"
      gzip_done = 1
    }
  ' "$SITE" > "$SITE.perf.tmp" && mv "$SITE.perf.tmp" "$SITE"
  echo "NGINX_GZIP_PATCHED"
else
  echo "NGINX_GZIP_SKIP"
fi

# Drop stale / incomplete cache blocks so we can re-insert a known-good pair.
if grep -q 'location \^~ /assets/' "$SITE" || grep -q 'location \^~ /fonts/' "$SITE"; then
  awk '
    /^[[:space:]]*location \^~ \/assets\/ \{/ { skip=1; next }
    /^[[:space:]]*location \^~ \/fonts\/ \{/ { skip=1; next }
    skip && /^[[:space:]]*\}/ { skip=0; next }
    skip { next }
    { print }
  ' "$SITE" > "$SITE.cache.tmp" && mv "$SITE.cache.tmp" "$SITE"
  echo "NGINX_CACHE_BLOCKS_RESET"
fi

if ! grep -q 'location \^~ /assets/' "$SITE"; then
  awk -v assets="$CACHE_ASSETS" -v fonts="$CACHE_FONTS" '
    BEGIN { cache_done = 0 }
    /^[[:space:]]*server[[:space:]]*\{/ {
      listen_443 = 0
      apex_name = 0
      dist_root = 0
    }
    /listen[[:space:]]+443/ { listen_443 = 1 }
    /server_name[[:space:]]+advokat-tuapse\.ru[[:space:]]*;/ { apex_name = 1 }
    /^[[:space:]]*root[[:space:]]+.*advokat-tuapse\/dist[[:space:]]*;/ { dist_root = 1 }
    /^[[:space:]]*location \/ \{/ && listen_443 && apex_name && dist_root && !cache_done {
      print assets
      print ""
      print fonts
      print ""
      cache_done = 1
    }
    { print }
  ' "$SITE" > "$SITE.cache.tmp" && mv "$SITE.cache.tmp" "$SITE"
  if ! grep -q 'location \^~ /assets/' "$SITE"; then
    echo "NGINX_CACHE_INSERT_FAILED"
    exit 1
  fi
  echo "NGINX_CACHE_PATCHED"
else
  echo "NGINX_CACHE_ALREADY_OK"
fi

ENABLED="/etc/nginx/sites-enabled/$(basename "$SITE")"
if [ -d /etc/nginx/sites-enabled ]; then
  cp "$SITE" "$ENABLED"
fi

nginx -t
systemctl reload nginx
echo "NGINX_RELOADED"

# Verify live headers (first JS asset in dist, if present).
DIST_ROOT="${DIST_ROOT:-/var/www/advokat-tuapse/dist}"
SAMPLE_JS="$(find "$DIST_ROOT/assets" -maxdepth 1 -name '*.js' -type f 2>/dev/null | head -1 || true)"
if [ -n "$SAMPLE_JS" ]; then
  SAMPLE_NAME="$(basename "$SAMPLE_JS")"
  ASSET_URL="https://advokat-tuapse.ru/assets/${SAMPLE_NAME}"
  CACHE_HDR="$(
    curl -k -fsSI --resolve "advokat-tuapse.ru:443:127.0.0.1" "$ASSET_URL" 2>/dev/null \
      | tr -d '\r' \
      | grep -i '^cache-control:' \
      || curl -fsSI "$ASSET_URL" 2>/dev/null | tr -d '\r' | grep -i '^cache-control:' \
      || true
  )"
  echo "CACHE_HEADER_ASSETS=${CACHE_HDR:-MISSING}"
  if ! echo "$CACHE_HDR" | grep -q 'max-age=31536000'; then
    echo "CACHE_VERIFY_FAILED"
    curl -k -fsSI --resolve "advokat-tuapse.ru:443:127.0.0.1" "$ASSET_URL" 2>/dev/null | tr -d '\r' || true
    nginx -T 2>/dev/null | grep -n -A4 'location \^~ /assets/' || true
    exit 1
  fi
  echo "CACHE_VERIFY_OK"
fi

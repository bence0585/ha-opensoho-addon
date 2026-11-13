#!/bin/sh
set -e
TOKEN=$(jq -r '.cloudflare_api_token // ""' /data/options.json)
if [ -z "$TOKEN" ]; then
  echo "HIBA: a cloudflare_api_token opció üres. Add meg a Configuration fülön, majd indítsd újra." >&2
  exit 1
fi
export CLOUDFLARE_API_TOKEN="$TOKEN"
mkdir -p /data/caddy
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

#!/bin/sh
set -e

PGDATA=/data/postgres
UPLOADS=/media/zipline/uploads
log() { echo "[Zipline] $*"; }

mkdir -p "$UPLOADS" /run/postgresql
chown postgres:postgres /run/postgresql

# Secret for sessions; generated once and kept in /data.
if [ ! -s /data/core_secret ]; then
  head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48 > /data/core_secret
  chmod 600 /data/core_secret
fi

# PostgreSQL: only reachable inside this container (127.0.0.1 + socket).
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  log "Adatbázis létrehozása (első indítás)..."
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  su-exec postgres initdb -D "$PGDATA" -U postgres -E UTF8 --auth=trust >/dev/null
fi

su-exec postgres postgres -D "$PGDATA" -c listen_addresses=127.0.0.1 -c port=5432 &
PG_PID=$!

i=0
until su-exec postgres pg_isready -q -h 127.0.0.1; do
  i=$((i + 1))
  [ "$i" -gt 60 ] && { log "HIBA: a PostgreSQL nem indult el."; exit 1; }
  sleep 1
done

psql_q() { su-exec postgres psql -h 127.0.0.1 -U postgres -tAc "$1"; }
[ "$(psql_q "SELECT 1 FROM pg_roles WHERE rolname='zipline'")" = 1 ] || psql_q "CREATE ROLE zipline LOGIN"
[ "$(psql_q "SELECT 1 FROM pg_database WHERE datname='zipline'")" = 1 ] || psql_q "CREATE DATABASE zipline OWNER zipline"

export CORE_SECRET="$(cat /data/core_secret)"
export CORE_PORT=3001
export CORE_HOSTNAME=127.0.0.1
# The front proxy (server.js) and the HA/Cloudflared network are trusted.
export CORE_TRUSTED_PROXIES=127.0.0.1,172.30.32.0/23
export DATABASE_URL="postgresql://zipline@127.0.0.1:5432/zipline"
export DATASOURCE_TYPE=local
export DATASOURCE_LOCAL_DIRECTORY="$UPLOADS"
export CORE_TEMP_DIRECTORY=/media/zipline/.tmp

# Behind the Cloudflare tunnel (HTTPS): return https:// links, trust X-Forwarded-*.
OPTS=/data/options.json
export CORE_RETURN_HTTPS_URLS="$(jq -r '.return_https_urls // true' "$OPTS")"
export CORE_TRUST_PROXY="$(jq -r '.trust_proxy // true' "$OPTS")"
DOMAIN="$(jq -r '.default_domain // empty' "$OPTS")"
[ -n "$DOMAIN" ] && export CORE_DEFAULT_DOMAIN="$DOMAIN"
mkdir -p "$CORE_TEMP_DIRECTORY"

stop() {
  log "Leállítás..."
  if [ -n "$ZL_PID" ]; then
    kill -TERM "$ZL_PID" 2>/dev/null || true
    wait "$ZL_PID" 2>/dev/null || true
  fi
  # SIGINT = PostgreSQL "fast" shutdown (clean checkpoint, no recovery needed).
  kill -INT "$PG_PID" 2>/dev/null || true
  wait "$PG_PID" 2>/dev/null || true
  log "Leállítva."
  exit 0
}
trap stop TERM INT

export HTTP_WEBHOOK_ON_UPLOAD=http://127.0.0.1:3999/upload

log "Indulás: http://<ha-ip>:3010 (első belépésnél hozd létre az admin fiókot)"
cd /zipline
node --enable-source-maps build/server/index.js &
ZL_PID=$!

# Front proxy on :3000 (link cards, Cloudflare warm-up, Discord pre-warm).
ZP_DOMAIN="$DOMAIN" ZP_UPLOADS="$UPLOADS" \
ZP_CARD_MB="$(jq -r '.card_threshold_mb // 35' "$OPTS")" \
ZP_CF_WARMUP="$(jq -r '.cache_warmup // true' "$OPTS")" \
ZP_PREWARM_WEBHOOK="$(jq -r '.discord_prewarm_webhook // empty' "$OPTS")" \
  node /server.js &
PX_PID=$!

# If either process dies, stop the other one too (the Supervisor watchdog restarts).
while kill -0 "$ZL_PID" 2>/dev/null && kill -0 "$PG_PID" 2>/dev/null && kill -0 "$PX_PID" 2>/dev/null; do
  sleep 1
done
log "Egy folyamat leállt, kilépés."
stop

#!/bin/sh
set -e

SECRET="$(jq -r '.shared_secret // empty' /data/options.json)"
SEED="$(jq -r '.seed_backup // empty' /data/options.json)"

if [ -z "$SECRET" ]; then
  echo "[OpenSOHO dev] HIBA: állíts be egy 'shared_secret'-et az add-on Konfiguráció fülén!"
  exit 1
fi

# Első indításkor az éles példány PocketBase mentéséből tölt (a /share-ből),
# később a saját adatbázisával megy tovább.
if [ ! -f /data/pb_data/data.db ]; then
  if [ -n "$SEED" ] && [ -f "/share/$SEED" ]; then
    echo "[OpenSOHO dev] Adatbázis betöltése: /share/$SEED"
    mkdir -p /data/pb_data
    unzip -q "/share/$SEED" -d /data/pb_data
  else
    echo "[OpenSOHO dev] Nincs mentés (/share/$SEED), üres adatbázissal indul."
  fi
fi

export OPENSOHO_SHARED_SECRET="$SECRET"
cd /app

echo "[OpenSOHO dev] Indulás a 8091-es porton..."
exec ./opensoho serve --http 0.0.0.0:8091 --dir /data/pb_data

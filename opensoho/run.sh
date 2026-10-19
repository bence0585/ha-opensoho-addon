#!/bin/sh
set -e

SECRET="$(jq -r '.shared_secret // empty' /data/options.json)"

if [ -z "$SECRET" ]; then
  echo "[OpenSOHO] HIBA: állíts be egy hosszú, véletlen 'shared_secret'-et az add-on Konfiguráció fülén!"
  exit 1
fi

# Az adatbázis a HA /data mappájában marad, így túléli a frissítéseket
# és benne van a Home Assistant mentésekben is.
mkdir -p /data/pb_data
ln -sfn /data/pb_data /app/pb_data

export OPENSOHO_SHARED_SECRET="$SECRET"
cd /app

echo "[OpenSOHO] Indulás a 8090-es porton..."
echo "[OpenSOHO] Első indításnál lent megjelenik egy admin-létrehozó link."
echo "[OpenSOHO] A linkben a 0.0.0.0 helyére írd a Home Assistant szerver IP-címét."

exec ./opensoho serve --http 0.0.0.0:8090 --dir /data/pb_data

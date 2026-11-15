#!/bin/sh
# ASF konfig a /data-ban; az IPC (webes felulet) csak jelszoval indul el a halozaton.
set -e
OPT=/data/options.json
PW=$(jq -r '.ipc_password // ""' "$OPT")
if [ -z "$PW" ]; then
  echo "Az ipc_password ures. Adj meg egy eros jelszot az app Configuration fulen, majd inditsd ujra."
  exec sleep infinity
fi

mkdir -p /data/config /data/logs
rm -rf /app/config /app/logs
ln -s /data/config /app/config
ln -s /data/logs /app/logs

CFG=/data/config/ASF.json
[ -f "$CFG" ] || echo '{}' > "$CFG"
jq --arg pw "$PW" '. + {IPCPassword: $pw, Headless: true}' "$CFG" > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
echo '{"Kestrel":{"Endpoints":{"HTTP":{"Url":"http://*:1242"}}}}' > /data/config/IPC.config
chmod 600 "$CFG"
exec ArchiSteamFarm --no-restart

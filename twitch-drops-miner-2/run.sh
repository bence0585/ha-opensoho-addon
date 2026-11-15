#!/bin/sh
# Persist config + cache in /data (included in HA backups), then hand over
# to the upstream entrypoint (it drops privileges to USER_ID/GROUP_ID).
set -e
TZ_OPT=$(grep -o '"timezone": *"[^"]*"' /data/options.json | sed 's/.*: *"\(.*\)"/\1/')
[ -n "$TZ_OPT" ] && export TZ="$TZ_OPT"

mkdir -p /data/config /data/cache
chown -R "${USER_ID:-1000}:${GROUP_ID:-1000}" /data/config /data/cache
rm -rf /TwitchDropsMiner/config /TwitchDropsMiner/cache
ln -s /data/config /TwitchDropsMiner/config
ln -s /data/cache /TwitchDropsMiner/cache

# IDEIGLENES export (2026-11-15): cookies.jar masolat a /share-be, GrubDrops-ba importalashoz.
echo "[export] /data tartalma:"; find /data -maxdepth 3 -not -path '/data/cache/*' 2>/dev/null | head -40
COOKIE=$(find /data /TwitchDropsMiner -maxdepth 3 -name cookies.jar 2>/dev/null | head -1)
if [ -n "$COOKIE" ]; then
  mkdir -p /share/twitch-cookies
  cp "$COOKIE" /share/twitch-cookies/miner2-cookies.jar
  chmod 600 /share/twitch-cookies/miner2-cookies.jar
  echo "[export] masolva: $COOKIE -> /share/twitch-cookies/miner2-cookies.jar"
else
  echo "[export] NEM talaltam cookies.jar-t"
fi

exec /entrypoint.sh "$@"

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

exec /entrypoint.sh "$@"

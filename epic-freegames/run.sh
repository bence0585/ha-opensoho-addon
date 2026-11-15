#!/bin/sh
# HA opciokbol kesziti a config.json-t; a munkamenetek/suti-k a /data/config-ban maradnak.
set -e
OPT=/data/options.json
mkdir -p /data/config
# A /usr/app/config a kep VOLUME-ja (nem cserelheto), ezert a programot a /data/config-ra iranyitjuk.
export CONFIG_DIR=/data/config

N=$(jq '.accounts | length' "$OPT")
if [ "$N" -eq 0 ]; then
  echo "Nincs megadva Epic fiok. Add meg az e-mail cimeket az app Configuration fulen (accounts), majd inditsd ujra."
  exec sleep infinity
fi

jq '{
  runOnStartup: true,
  cronSchedule: "0 0,6,12,18 * * *",
  timezone: .timezone,
  countryCode: .country_code,
  accounts: [.accounts[] | {email: .}],
  webPortalConfig: {baseUrl: .base_url},
  notifiers: (if (.discord_webhook // "") != "" then [{type: "discord", webhookUrl: .discord_webhook}] else [] end)
}' "$OPT" > /data/config/config.json
chmod 600 /data/config/config.json
echo "Epic fiokok szama: $N"
exec /usr/local/bin/docker-entrypoint.sh

# bence0585 Home Assistant add-ons

Add this repository in Home Assistant (Settings → Add-ons → Add-on store → ⋮ → Repositories).

## OpenSOHO

Wrapper for [OpenSOHO](https://github.com/rubenbe/opensoho). Install OpenSOHO, set `shared_secret`, start it, then open `http://<ha-ip>:8090/_/`.

## Zipline

[Zipline](https://github.com/diced/zipline) (ShareX / Flameshot upload server with Discord embeds) with a private PostgreSQL inside the same container.

- Web UI: `http://<ha-ip>:3010/` — the first visit creates the admin account.
- Uploads: `/media/zipline/uploads` (database: the add-on's `/data`).
- For public links put it behind a reverse proxy or Cloudflare Tunnel (service `http://<ha-ip>:3010`).

## Twitch Drops Miner

Local-friendly wrapper around `dungfu/twitch-drops-miner` (web UI on port 5800).
Config/cache live in `/data`. Do not expose port 5800 to the internet.

## GrubDrops

Twitch/Kick drops miner with several accounts in one instance (web UI on host port 5802,
data and master.key in `/data`). Twitch only; Kick needs Docker-socket sidecars and is not supported here.

## Epic Free Games / ArchiSteamFarm

`epic-freegames/`: claabs/epicgames-freegames-node, several Epic accounts from the `accounts` option
(device-code login via the web portal on host port 3011). `archisteamfarm/`: ASF with ASF-ui on port 1242;
refuses to start without `ipc_password`. Neither stores passwords in the add-on options.

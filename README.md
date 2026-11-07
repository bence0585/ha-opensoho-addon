# bence0585 Home Assistant add-ons

Add this repository in Home Assistant (Settings → Add-ons → Add-on store → ⋮ → Repositories).

## OpenSOHO

Wrapper for [OpenSOHO](https://github.com/rubenbe/opensoho). Install OpenSOHO, set `shared_secret`, start it, then open `http://<ha-ip>:8090/_/`.

## Zipline

[Zipline](https://github.com/diced/zipline) (ShareX / Flameshot upload server with Discord embeds) with a private PostgreSQL inside the same container.

- Web UI: `http://<ha-ip>:3010/` — the first visit creates the admin account.
- Uploads: `/media/zipline/uploads` (database: the add-on's `/data`).
- For public links put it behind a reverse proxy or Cloudflare Tunnel (service `http://<ha-ip>:3010`).

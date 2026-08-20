# Where is Chris?

A public two-view Google Maps dashboard and multi-source AIS history collector for MarineTraffic ship ID `447122` / MMSI `367482180`.

## Runtime

- React + Vite frontend in `dist/`
- Python 3.12 standard-library API server on `127.0.0.1:8765`
- Neon Postgres is the remote source read directly by Vercel
- SQLite history at `data/positions.db` remains a local write-through backup
- AISStream provides a persistent real-time WebSocket feed
- A user-level systemd timer checks freshness and polls MarineTraffic when its optional API key is configured
- Tailscale Funnel still publishes the original local dashboard as a backup
- OpenClaw delivers stale and recovery alerts to Slack

## Configuration

Copy `.env.example` to `.env` and set `AISSTREAM_API_KEY`. Set either `DATABASE_URL` or `NEON_SHARED_ENV_FILE`; the current machine uses the latter to read only `DATABASE_URL` from the existing private `plank_checkin/.env.local`. An enabled MarineTraffic Single Vessel Positions API key can also be configured as a fallback. The Google Maps key can be supplied directly, or fetched at runtime from a Google API Keys resource ID. Keep all environment files private.

The stale threshold defaults to 20 minutes. Duplicate reports from either provider are not inserted a second time, and the dashboard selects the newest valid report across all sources.

The Python collectors mirror every local position to the namespaced Neon tables `where_is_chris_positions` and `where_is_chris_collector_runs`. Vercel serverless API routes query those tables directly, so public reads do not depend on the home machine being online. Run a full local-to-Neon reconciliation at any time with:

```bash
/home/zhihongz/venv/3.12/bin/python -m backend.neon
```

If AISStream coverage is absent, a Firefox Network HAR captured from the vessel page can be imported without storing its request cookies in the tracker database:

```bash
/home/zhihongz/venv/3.12/bin/python -m backend.marinetraffic_har /path/to/marinetraffic.har
```

## Commands

```bash
npm install
/home/zhihongz/venv/3.12/bin/python -m pip install -r requirements.txt
npm run build
npm run lint
npm run test:backend
```

The installed units are source-linked from `systemd/`, so edits here take effect after `systemctl --user daemon-reload` and a service restart.

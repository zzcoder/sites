# FIFA Fan Zone DC · 3D wayfinding map

A React/Vite map experience using Google Maps JavaScript API Photorealistic 3D to show the announced FIFA World Cup 2026 Fan Zone on the National Mall, a suggested entrance, Federal Center SW Metro access, limited metered parking, the U.S. Capitol, and an illustrative big-screen placement.

## Run it

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_GOOGLE_MAPS_API_KEY` to a browser-restricted key with the **Maps JavaScript API** and **3D Maps** enabled. The app intentionally does not substitute a generated or synthetic map when a key is missing.

The TV is placed on the geographic sightline from the Fan Zone toward the U.S. Capitol. The overview camera is rotated so the TV reads in the foreground with the Capitol directly behind it.

## Restore or deploy

1. Clone the repository and enter `fan_zone/`.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and provide a browser-restricted Google
   Maps API key.
4. Run `npm run build`.

Deploy the generated `dist/` directory to a static host, or import this
directory into Vercel and configure `VITE_GOOGLE_MAPS_API_KEY` there. Never
commit `.env.local` or an unrestricted API key.

## Map assumptions

- The event lawn follows the Freedom 250 announcement: the National Mall between 3rd and 4th Streets.
- The west-side entrance and big-screen placement are planning illustrations because the announcement does not publish a gate plan or screen location.
- Federal Center SW, 401 3rd Street SW, is used as the closest practical Metro access point.
- The parking marker represents limited NPS metered street parking on Madison Drive NW, not a reserved event lot. Event restrictions may supersede normal parking rules.

## Source links

- [Freedom 250 Fan Zone announcement](https://freedom250.org/media-center/press-release/freedom-250-announces-fifa-world-cup-2026-fan-zone-washington-dc)
- [National Mall parking guidance](https://www.nps.gov/nama/planyourvisit/parking.htm)
- [National Mall transit guidance](https://www.nps.gov/nama/planyourvisit/gettingaround.htm)
- [WMATA Federal Center SW station](https://www.wmata.com/ridertools/station/federal-center-sw/info)
- [Google Maps JavaScript API 3D maps](https://developers.google.com/maps/documentation/javascript/3d-map)

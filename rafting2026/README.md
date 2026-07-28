# Rafting in New River, WV 2026

A polished, static multimedia itinerary for the August 1–2, 2026 trip from Great Falls, Virginia to New River Gorge, West Virginia.

## Preview locally

From this folder:

```zsh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The page works without a build step. Its photographs, itinerary, research links, fallback route sketch, responsive layout, and photo lightbox all work without API keys.

## Activate the interactive Google route map

The live map uses the current Google Maps JavaScript **Routes Library** rather than the deprecated Directions Service.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project with billing enabled.
2. Enable:
   - [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)
   - [Routes API](https://console.cloud.google.com/apis/library/routes.googleapis.com)
3. Create a browser API key under **APIs & Services → Credentials**.
4. Restrict the key:
   - **Application restriction:** Websites (HTTP referrers)
   - For local testing, add `http://localhost:4173/*`
   - Add the final production domain before deployment
   - **API restrictions:** Maps JavaScript API and Routes API only
5. Put the restricted key in `config.js`:

```js
window.RAFTING_CONFIG = {
  googleMapsApiKey: "YOUR_RESTRICTED_GOOGLE_MAPS_API_KEY",
};
```

6. Reload the page. Day 1, Day 2, and All stops controls will filter the live route.

Static browser map keys are visible to visitors by design. Security comes from strict HTTP-referrer and API restrictions, not from trying to hide the key in client-side JavaScript.

## Project structure

```text
.
├── index.html
├── styles.css
├── script.js
├── config.js
├── config.example.js
└── assets
    ├── artwork
    ├── icons
    └── images
```

## Important itinerary notes

- Grandview Rim Trail is officially 3.2 miles round trip and rated moderate by NPS.
- Canyon Rim Visitor Center has overlook paths and a boardwalk, not a full trailhead. The lower viewpoint requires 178 steps.
- On August 1, 2026, sunset is 8:33 PM and astronomical twilight ends at 10:16 PM. The moon is about 93% illuminated and rises at 10:09 PM, so Milky Way visibility is expected to be limited.
- Reconfirm the rafting check-in point, waiver, participant requirements, and start time directly with Adventures on the Gorge.
- Check the NPS closures and weather pages immediately before departure.

## Photo provenance

- Most photographs were supplied locally by the trip organizer.
- `grandview-bend.webp` is an NPS image credited to Dave Bieri and used with its on-page credit.

# Chicago Cartogram

This is the Chicago MVP built alongside `nyc-cartogram/`, which remains a reference copy.

It keeps the NYC project's look and features while swapping in Chicago inputs:

- Chicago neighborhood polygons for labeled areas
- CTA, Metra, and Pace GTFS data for stops, routes, and scheduled travel times
- Chicago parks and optional OSM major streets for basemap context
- a static SVG cartogram path and an interactive commute-time app

The MVP models scheduled CTA rail, CTA bus, Metra, and Pace service. It does not model driving, fares, real-time schedules, or service alerts.

## Requirements

- Python 3
- No Python package install step; the builders use the standard library

## Build The Interactive Site Data

```bash
python3 build_commute_site_data.py
```

Output:

```text
site/data/commute_map_data.json
```

The first run downloads Chicago neighborhood data, Chicago parks, Census county land, and official CTA, Metra, and Pace GTFS ZIPs into `data/`.

## Local Preview

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/site/
```

Address search uses OpenStreetMap Nominatim at runtime, so that feature needs internet access.

## Optional: Real Road Routing For The Probe Measurement

Walk/bike/drive distances are a straight-line estimate (times a fixed
circuity multiplier) everywhere in the app except one place: once you pin an
origin and tap a second point to measure it, that single point-to-point
reading can instead follow real streets. This is off by default -- the app
behaves exactly as before until you deploy the proxy and set a URL.

Why a proxy at all: the routing data comes from
[OpenRouteService](https://openrouteservice.org/), and its API key can't sit
in client-side JS (anyone could scrape and abuse it), so `worker/index.js`
is a small [Cloudflare Worker](https://workers.cloudflare.com/) that holds
the key server-side and proxies just the one `/route` request the client
needs. It's deliberately scoped to that single measurement -- the full
heatmap/warp would mean tens of thousands of routed queries per drag frame,
which no routing API (free or paid) is built to serve live.

Setup:

1. Sign up for a free [OpenRouteService API key](https://openrouteservice.org/dev/#/signup).
2. `npm install`, then `npm run login` (Cloudflare account required).
3. `npx wrangler secret put ORS_API_KEY` and paste the key when prompted.
4. `npm run deploy` -- prints your Worker's `https://*.workers.dev` URL.
5. Paste that URL into `ROAD_ROUTING_PROXY_URL` near the top of `site/app.js`.

Local testing without deploying: put `ORS_API_KEY=...` in a `.dev.vars`
file (gitignored) and run `npm run dev` to serve the Worker at
`http://localhost:8787`.

## Project Layout

- `build_commute_site_data.py`: builds the interactive site data bundle
- `generate_chicago_cta_weighted_projection.py`: builds the static SVG cartogram
- `site/index.html`: app shell and metadata
- `site/app.js`: interactive map, search, sharing, and rendering logic
- `site/styles.css`: site styles
- `site/data/commute_map_data.json`: generated site dataset
- `worker/index.js`: optional Cloudflare Worker proxying real road routing for the probe measurement (see above)
- `wrangler.toml`: Worker deployment config

## Data Sources

- CTA GTFS: `https://www.transitchicago.com/downloads/sch_data/google_transit.zip`
- Metra GTFS: `https://schedules.metrarail.com/gtfs/schedule.zip`
- Pace GTFS: `https://www.pacebus.com/gtfsdownload`
- Chicago neighborhood boundaries: ArcGIS FeatureServer / City of Chicago neighborhood data
- Chicago parks: City of Chicago Data Portal
- County land polygons: U.S. Census generalized county KML
- Major streets: optional OpenStreetMap Overpass export at `data/osm_major_streets.json`

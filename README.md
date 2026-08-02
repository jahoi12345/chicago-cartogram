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

## Project Layout

- `build_commute_site_data.py`: builds the interactive site data bundle
- `generate_chicago_cta_weighted_projection.py`: builds the static SVG cartogram
- `site/index.html`: app shell and metadata
- `site/app.js`: interactive map, search, sharing, and rendering logic
- `site/styles.css`: site styles
- `site/data/commute_map_data.json`: generated site dataset

## Data Sources

- CTA GTFS: `https://www.transitchicago.com/downloads/sch_data/google_transit.zip`
- Metra GTFS: `https://schedules.metrarail.com/gtfs/schedule.zip`
- Pace GTFS: `https://www.pacebus.com/gtfsdownload`
- Chicago neighborhood boundaries: ArcGIS FeatureServer / City of Chicago neighborhood data
- Chicago parks: City of Chicago Data Portal
- County land polygons: U.S. Census generalized county KML
- Major streets: optional OpenStreetMap Overpass export at `data/osm_major_streets.json`

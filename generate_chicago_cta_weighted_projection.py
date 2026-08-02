#!/usr/bin/env python3
"""Generate a static Chicago CTA-access weighted SVG from the site data bundle."""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Sequence


ROOT = Path(__file__).resolve().parent
SITE_DATA_PATH = ROOT / "site" / "data" / "commute_map_data.json"
OUTPUT_DIR = ROOT / "output"
OUTPUT_PATH = OUTPUT_DIR / "chicago_cta_weighted_projection.svg"

SVG_WIDTH = 1500
SVG_HEIGHT = 920
PADDING = 42
ROUTE_WIDTH = 2.4
STATION_RADIUS = 2.8

Point = Sequence[float]


def ensure_site_data() -> None:
    if SITE_DATA_PATH.exists():
        return
    subprocess.run([sys.executable, str(ROOT / "build_commute_site_data.py")], check=True)


def load_data() -> dict:
    ensure_site_data()
    return json.loads(SITE_DATA_PATH.read_text(encoding="utf-8"))


def bounds_for(data: dict) -> tuple[float, float, float, float]:
    return tuple(data["meta"]["bounds"])


def project(point: Point, bbox: tuple[float, float, float, float]) -> tuple[float, float]:
    min_x, min_y, max_x, max_y = bbox
    span_x = max_x - min_x
    span_y = max_y - min_y
    scale = min((SVG_WIDTH - 2 * PADDING) / span_x, (SVG_HEIGHT - 2 * PADDING) / span_y)
    offset_x = (SVG_WIDTH - span_x * scale) / 2
    offset_y = (SVG_HEIGHT - span_y * scale) / 2
    return (
        offset_x + (point[0] - min_x) * scale,
        SVG_HEIGHT - (offset_y + (point[1] - min_y) * scale),
    )


def path_for_ring(ring: Sequence[Point], bbox: tuple[float, float, float, float]) -> str:
    commands = []
    for index, point in enumerate(ring):
        x, y = project(point, bbox)
        commands.append(("M" if index == 0 else "L") + f"{x:.1f},{y:.1f}")
    return " ".join(commands) + " Z"


def path_for_line(points: Sequence[Point], bbox: tuple[float, float, float, float]) -> str:
    commands = []
    for index, point in enumerate(points):
        x, y = project(point, bbox)
        commands.append(("M" if index == 0 else "L") + f"{x:.1f},{y:.1f}")
    return " ".join(commands)


def escape(value: object) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def svg_paths_for_polygons(polygons: Iterable[Sequence[Sequence[Point]]], bbox: tuple[float, float, float, float]) -> list[str]:
    paths = []
    for polygon in polygons:
        if not polygon:
            continue
        paths.append(path_for_ring(polygon[0], bbox))
    return paths


def main() -> None:
    data = load_data()
    bbox = bounds_for(data)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SVG_WIDTH}" height="{SVG_HEIGHT}" viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}">',
        "<style>",
        "svg { background: #f7fbff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
        ".title { fill: #172033; font-size: 30px; font-weight: 800; }",
        ".subtitle { fill: #5d6b82; font-size: 14px; }",
        ".land { fill: #eef4fb; stroke: #c6d4e4; stroke-width: 0.7; }",
        ".park { fill: #dcefd9; stroke: none; opacity: 0.82; }",
        ".street { fill: none; stroke: #d7e0eb; stroke-width: 0.9; stroke-linecap: round; stroke-linejoin: round; opacity: 0.65; }",
        ".route { fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: 0.93; }",
        ".station { fill: #152238; stroke: white; stroke-width: 1.1; }",
        ".label { fill: #35506f; font-size: 9px; font-weight: 700; text-anchor: middle; opacity: 0.82; paint-order: stroke; stroke: #f7fbff; stroke-width: 3px; }",
        ".note { fill: #6d7788; font-size: 12px; }",
        "</style>",
        '<text x="42" y="42" class="title">Chicago regional transit-access weighted projection</text>',
        '<text x="42" y="66" class="subtitle">Neighborhoods, CTA rail routes, parks, and major streets in the shared app projection.</text>',
    ]

    for path in svg_paths_for_polygons(data.get("externalLand", []), bbox):
        parts.append(f'<path d="{path}" class="land" opacity="0.45" />')
    for neighborhood in data["boroughs"]:
        for path in svg_paths_for_polygons(neighborhood["polygons"], bbox):
            parts.append(f'<path d="{path}" class="land" />')
    for path in svg_paths_for_polygons(data.get("parks", []), bbox):
        parts.append(f'<path d="{path}" class="park" />')
    for street in data.get("streets", []):
        if len(street.get("points", [])) >= 2:
            parts.append(f'<path d="{path_for_line(street["points"], bbox)}" class="street" />')
    for route in data.get("busRoutes", []):
        if len(route.get("points", [])) >= 2:
            parts.append(f'<path d="{path_for_line(route["points"], bbox)}" class="street" stroke-opacity="0.28" />')
    for route in data["routes"]:
        if len(route.get("points", [])) < 2:
            continue
        width = ROUTE_WIDTH + 0.25 * math.log1p(len(route["points"]))
        parts.append(
            f'<path d="{path_for_line(route["points"], bbox)}" class="route" '
            f'stroke="{escape(route.get("color", "#333"))}" stroke-width="{width:.1f}" />'
        )
    for station in data["stations"]:
        x, y = project(station["point"], bbox)
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{STATION_RADIUS}" class="station"><title>{escape(station["name"])}</title></circle>')
    for neighborhood in data["boroughs"]:
        x, y = project(neighborhood["label"], bbox)
        parts.append(f'<text x="{x:.1f}" y="{y:.1f}" class="label">{escape(neighborhood["name"])}</text>')

    parts.extend(
        [
            f'<text x="42" y="{SVG_HEIGHT - 30}" class="note">Data: CTA, Metra, Pace GTFS; Chicago Data Portal; U.S. Census; OpenStreetMap.</text>',
            "</svg>",
        ]
    )
    OUTPUT_PATH.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

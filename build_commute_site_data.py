#!/usr/bin/env python3
"""Build compact data assets for the interactive commute-time website."""

from __future__ import annotations

import csv
import json
import math
import statistics
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
SITE_DATA_PATH = ROOT / "site" / "data" / "commute_map_data.json"

NEIGHBORHOODS_URL = "https://services2.arcgis.com/xsh7pVZv42relbEf/arcgis/rest/services/Neighborhood%20Boundaries%20Chicago/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&outSR=4326"
PARKS_URL = "https://gisapps.cityofchicago.org/arcgis/rest/services/CachedMaps/CartoCache/MapServer/14/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
COUNTIES_KML_ZIP_URL = "https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_us_county_500k.zip"
CTA_GTFS_URL = "https://www.transitchicago.com/downloads/sch_data/google_transit.zip"
METRA_GTFS_URL = "https://schedules.metrarail.com/gtfs/schedule.zip"
PACE_GTFS_URL = "https://www.pacebus.com/gtfsdownload"

NEIGHBORHOODS_PATH = DATA_DIR / "chicago_neighborhoods.geojson"
PARKS_PATH = DATA_DIR / "parks_open_space.geojson"
STREETS_PATH = DATA_DIR / "osm_major_streets.json"
CTA_GTFS_PATH = DATA_DIR / "cta_gtfs.zip"
METRA_GTFS_PATH = DATA_DIR / "metra_gtfs.zip"
PACE_GTFS_PATH = DATA_DIR / "pace_gtfs.zip"
GTFS_PATH = CTA_GTFS_PATH
COUNTIES_KML_ZIP_PATH = DATA_DIR / "cb_2024_us_county_500k.zip"

GTFS_FEEDS = (
    {
        "id": "cta",
        "name": "CTA",
        "path": CTA_GTFS_PATH,
        "url": CTA_GTFS_URL,
        "route_types": {"1", "3"},
    },
    {
        "id": "metra",
        "name": "Metra",
        "path": METRA_GTFS_PATH,
        "url": METRA_GTFS_URL,
        "route_types": {"2"},
    },
    {
        "id": "pace",
        "name": "Pace",
        "path": PACE_GTFS_PATH,
        "url": PACE_GTFS_URL,
        "route_types": {"3"},
    },
)

GRID_COLS = 160
GRID_ROWS = 160
MIN_PARK_AREA = 70_000.0
# Keep walking assumptions close to a normal city walking pace so first/last-mile
# time does not dominate otherwise reasonable CTA trips.
WALK_METERS_PER_MINUTE = 80.0
ACCESS_WALK_METERS_PER_MINUTE = 75.0
STATION_ACCESS_PENALTY = 3.5
CELL_NEAREST_STATIONS = 4
ORIGIN_NEAREST_STATIONS = 5
MAX_SHAPES_PER_ROUTE_DIRECTION = 2
MAX_REFERENCE_SHAPES_PER_ROUTE_DIRECTION = 1
STATION_SERVICE_AREA_RADIUS = 1800.0
INTER_COMPLEX_WALK_RADIUS = 260.0
INTER_COMPLEX_WALK_PENALTY = 2.0
DEFAULT_BOARD_WAIT = 4.0
TRANSFER_PENALTY = 4.0
INTER_COMPLEX_TRANSFER_PENALTY = 7.0
# Chicago's Metra lines don't share downtown terminals the way CTA lines share
# dense stop spacing: Union Station, LaSalle Street Station, and Millennium
# Station are each a several-block walk apart (600-1450m), well outside
# INTER_COMPLEX_WALK_RADIUS. Without a wider transfer radius scoped to Metra
# stations, those three station complexes -- and therefore all ten Metra
# lines -- have zero graph connectivity to each other, even though riders
# routinely make these downtown transfers on foot.
METRA_HUB_WALK_RADIUS = 1600.0

Point = Tuple[float, float]
Ring = List[Point]
Polygon = List[Ring]
MultiPolygon = List[Polygon]


def round_point(point: Point) -> List[float]:
    return [round(point[0], 1), round(point[1], 1)]


def round_path(points: Sequence[Point]) -> List[List[float]]:
    return [round_point(point) for point in points]


def download_if_missing(url: str, target: Path) -> None:
    if target.exists():
        return
    print(f"Downloading {url} -> {target}")
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Chicago Cartogram MVP)"},
    )
    with urllib.request.urlopen(request) as response:
        target.write_bytes(response.read())


def ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SITE_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    download_if_missing(NEIGHBORHOODS_URL, NEIGHBORHOODS_PATH)
    download_if_missing(PARKS_URL, PARKS_PATH)
    download_if_missing(COUNTIES_KML_ZIP_URL, COUNTIES_KML_ZIP_PATH)
    for feed in GTFS_FEEDS:
        download_if_missing(feed["url"], feed["path"])


def load_json(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


def lonlat_to_xy(lon: float, lat: float, lat0: float) -> Point:
    meters_per_deg_lat = 111_320.0
    meters_per_deg_lon = meters_per_deg_lat * math.cos(math.radians(lat0))
    return lon * meters_per_deg_lon, lat * meters_per_deg_lat


def geojson_polygons(geometry: dict) -> Iterable[list]:
    if not geometry:
        return
    if geometry["type"] == "Polygon":
        yield geometry["coordinates"]
    elif geometry["type"] == "MultiPolygon":
        yield from geometry["coordinates"]


def average_borough_latitude(payload: dict) -> float:
    total = 0.0
    count = 0
    for feature in payload["features"]:
        geometry = feature["geometry"]
        for polygon in geojson_polygons(geometry):
            for ring in polygon:
                for _, lat in ring:
                    total += lat
                    count += 1
    return total / max(count, 1)


def ring_area(ring: Sequence[Point]) -> float:
    area = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        area += x1 * y2 - x2 * y1
    return area / 2.0


def polygon_centroid(ring: Sequence[Point]) -> Point:
    area = ring_area(ring) or 1.0
    factor = 1.0 / (6.0 * area)
    cx = 0.0
    cy = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        cross = x1 * y2 - x2 * y1
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    return cx * factor, cy * factor


def simplify_polyline(points: Sequence[Point], min_distance: float) -> List[Point]:
    if len(points) <= 2:
        return list(points)
    simplified = [points[0]]
    for point in points[1:-1]:
        if math.hypot(point[0] - simplified[-1][0], point[1] - simplified[-1][1]) >= min_distance:
            simplified.append(point)
    if points[-1] != simplified[-1]:
        simplified.append(points[-1])
    return simplified


def simplify_ring(ring: Sequence[Point], min_distance: float) -> Ring:
    if len(ring) <= 4:
        return list(ring)
    core = list(ring[:-1]) if ring[0] == ring[-1] else list(ring)
    simplified = [core[0]]
    for point in core[1:]:
        if math.hypot(point[0] - simplified[-1][0], point[1] - simplified[-1][1]) >= min_distance:
            simplified.append(point)
    if len(simplified) < 3:
        simplified = core[:3]
    simplified.append(simplified[0])
    return simplified


def bounds_of_ring(ring: Sequence[Point]) -> Tuple[float, float, float, float]:
    xs = [x for x, _ in ring]
    ys = [y for _, y in ring]
    return min(xs), min(ys), max(xs), max(ys)


def bounds_of_multipolygon(multipolygon: MultiPolygon) -> Tuple[float, float, float, float]:
    xs = [x for polygon in multipolygon for ring in polygon for x, _ in ring]
    ys = [y for polygon in multipolygon for ring in polygon for _, y in ring]
    return min(xs), min(ys), max(xs), max(ys)


def bounds_of_points(points: Sequence[Point]) -> Tuple[float, float, float, float]:
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    return min(xs), min(ys), max(xs), max(ys)


def expand_bbox(bbox: Tuple[float, float, float, float], amount: float) -> Tuple[float, float, float, float]:
    min_x, min_y, max_x, max_y = bbox
    return min_x - amount, min_y - amount, max_x + amount, max_y + amount


def combine_bboxes(*bboxes: Tuple[float, float, float, float]) -> Tuple[float, float, float, float]:
    return (
        min(bbox[0] for bbox in bboxes),
        min(bbox[1] for bbox in bboxes),
        max(bbox[2] for bbox in bboxes),
        max(bbox[3] for bbox in bboxes),
    )


def bbox_intersects(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> bool:
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def point_in_ring(point: Point, ring: Sequence[Point]) -> bool:
    x, y = point
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersects = (yi > y) != (yj > y)
        if intersects:
            x_hit = (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
            if x < x_hit:
                inside = not inside
        j = i
    return inside


def point_in_polygon(point: Point, polygon: Polygon) -> bool:
    if not polygon:
        return False
    if not point_in_ring(point, polygon[0]):
        return False
    for hole in polygon[1:]:
        if point_in_ring(point, hole):
            return False
    return True


def point_in_multipolygon(point: Point, multipolygon: MultiPolygon) -> bool:
    return any(point_in_polygon(point, polygon) for polygon in multipolygon)


def circle_polygon(center: Point, radius: float, segments: int = 28) -> Polygon:
    cx, cy = center
    ring = [
        (
            cx + math.cos((2.0 * math.pi * index) / segments) * radius,
            cy + math.sin((2.0 * math.pi * index) / segments) * radius,
        )
        for index in range(segments)
    ]
    ring.append(ring[0])
    return [ring]


def build_station_service_polygons(stations: list, land_polygons: MultiPolygon) -> MultiPolygon:
    polygons: MultiPolygon = []
    polygon_boxes = [bounds_of_ring(polygon[0]) for polygon in land_polygons if polygon]
    for station in stations:
        point = station["point"]
        is_on_land = any(
            box[0] <= point[0] <= box[2]
            and box[1] <= point[1] <= box[3]
            and point_in_polygon(point, polygon)
            for polygon, box in zip(land_polygons, polygon_boxes)
        )
        if is_on_land:
            continue
        polygons.append(circle_polygon(point, STATION_SERVICE_AREA_RADIUS))
    return polygons


def feature_label(properties: dict) -> str:
    for key in ("pri_neigh", "sec_neigh", "community", "name", "NAME"):
        value = properties.get(key)
        if value:
            return str(value).title()
    return "Chicago"


def extract_boroughs(payload: dict, lat0: float) -> Tuple[list, MultiPolygon]:
    boroughs = []
    all_polygons: MultiPolygon = []
    for feature in payload["features"]:
        geometry = feature["geometry"]
        multipolygon: MultiPolygon = []
        for polygon_coords in geojson_polygons(geometry):
            polygon: Polygon = []
            for ring_coords in polygon_coords:
                ring = [lonlat_to_xy(lon, lat, lat0) for lon, lat in ring_coords]
                polygon.append(simplify_ring(ring, 120.0))
            multipolygon.append(polygon)
            all_polygons.append(polygon)
        if not multipolygon:
            continue
        largest_polygon = max(multipolygon, key=lambda polygon: abs(ring_area(polygon[0])))
        boroughs.append(
            {
                "name": feature_label(feature.get("properties", {})),
                "label": round_point(polygon_centroid(largest_polygon[0])),
                "polygons": [[round_path(ring) for ring in polygon] for polygon in multipolygon],
            }
        )
    return boroughs, all_polygons


def extract_parks(lat0: float, bbox: Tuple[float, float, float, float]) -> list:
    if not PARKS_PATH.exists():
        return []
    payload = load_json(PARKS_PATH)
    parks = []
    for feature in payload["features"]:
        try:
            props = feature.get("properties", {})
            area = float(props.get("shape_area") or props.get("SHAPE.AREA") or props.get("acres", 0.0) or 0.0)
        except (TypeError, ValueError):
            area = 0.0
        if area and area < MIN_PARK_AREA:
            continue
        geometry = feature.get("geometry")
        if not geometry:
            continue
        for polygon_coords in geojson_polygons(geometry):
            polygon: Polygon = []
            for ring_coords in polygon_coords:
                ring = [lonlat_to_xy(lon, lat, lat0) for lon, lat in ring_coords]
                polygon.append(simplify_ring(ring, 90.0))
            if polygon and bbox_intersects(bounds_of_ring(polygon[0]), bbox):
                parks.append([round_path(ring) for ring in polygon])
    return parks


def extract_streets(lat0: float, bbox: Tuple[float, float, float, float]) -> list:
    if not STREETS_PATH.exists():
        return []
    payload = load_json(STREETS_PATH)
    allowed = {"motorway", "trunk", "primary"}
    streets = []
    for element in payload.get("elements", []):
        if element.get("type") != "way":
            continue
        tags = element.get("tags", {})
        kind = tags.get("highway")
        if kind not in allowed or "geometry" not in element or "name" not in tags:
            continue
        points = [lonlat_to_xy(node["lon"], node["lat"], lat0) for node in element["geometry"]]
        if len(points) < 2:
            continue
        length = sum(distance for distance in (
            math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1])
            for i in range(len(points) - 1)
        ))
        if kind == "primary" and length < 900.0:
            continue
        simplified = simplify_polyline(points, 220.0)
        if len(simplified) < 2 or not bbox_intersects(bounds_of_points(simplified), bbox):
            continue
        streets.append({"kind": kind, "name": tags["name"], "points": round_path(simplified)})
    return streets


def parse_kml_coordinates(text: str, lat0: float) -> Ring:
    ring: Ring = []
    for item in text.replace("\n", " ").split():
        parts = item.split(",")
        if len(parts) < 2:
            continue
        lon = float(parts[0])
        lat = float(parts[1])
        ring.append(lonlat_to_xy(lon, lat, lat0))
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def build_external_land_polygons(
    lat0: float,
    bbox: Tuple[float, float, float, float],
    borough_polygons: MultiPolygon,
) -> list:
    if not COUNTIES_KML_ZIP_PATH.exists():
        return []

    include_states = {"IL", "IN", "WI"}
    exclude_geoids: set[str] = set()
    namespace = {"kml": "http://www.opengis.net/kml/2.2"}
    polygons = []

    with zipfile.ZipFile(COUNTIES_KML_ZIP_PATH) as archive:
      with archive.open("cb_2024_us_county_500k.kml") as handle:
        for _, placemark in ET.iterparse(handle, events=("end",)):
            if not placemark.tag.endswith("Placemark"):
                continue
            data = {
                item.attrib.get("name"): (item.text or "")
                for item in placemark.findall(".//kml:SimpleData", namespace)
            }
            geoid = data.get("GEOID")
            stusps = data.get("STUSPS")
            if geoid in exclude_geoids or stusps not in include_states:
                placemark.clear()
                continue

            multipolygon: MultiPolygon = []
            for polygon_node in placemark.findall(".//kml:Polygon", namespace):
                rings = []
                for ring_node in polygon_node.findall("./kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", namespace):
                    ring = parse_kml_coordinates(ring_node.text or "", lat0)
                    if len(ring) >= 4:
                        rings.append(simplify_ring(ring, 120.0))
                for ring_node in polygon_node.findall("./kml:innerBoundaryIs/kml:LinearRing/kml:coordinates", namespace):
                    ring = parse_kml_coordinates(ring_node.text or "", lat0)
                    if len(ring) >= 4:
                        rings.append(simplify_ring(ring, 120.0))
                if rings:
                    multipolygon.append(rings)

            visible_polygons = []
            for polygon in multipolygon:
                if not bbox_intersects(bounds_of_ring(polygon[0]), bbox):
                    continue
                if point_in_multipolygon(polygon_centroid(polygon[0]), borough_polygons):
                    continue
                visible_polygons.append([round_path(ring) for ring in polygon])
            if visible_polygons:
                polygons.extend(visible_polygons)
            placemark.clear()

    return polygons


def read_csv_from_zip(gtfs_path: Path, member: str) -> Iterable[dict]:
    with zipfile.ZipFile(gtfs_path) as archive:
        with archive.open(member) as handle:
            reader = csv.DictReader(line.decode("utf-8-sig") for line in handle)
            for row in reader:
                yield {
                    (key or "").strip(): (value.strip() if isinstance(value, str) else value)
                    for key, value in row.items()
                }


def parse_gtfs_time(value: str) -> int:
    hours, minutes, seconds = map(int, value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def build_station_data(lat0: float) -> Tuple[list, Dict[str, int], Dict[str, str]]:
    rail_route_ids = {
        row["route_id"]
        for row in read_csv_from_zip(GTFS_PATH, "routes.txt")
        if row.get("route_type") == "1"
    }
    rail_trip_ids = {
        row["trip_id"]
        for row in read_csv_from_zip(GTFS_PATH, "trips.txt")
        if row.get("route_id") in rail_route_ids
    }
    rail_stop_ids = {
        row["stop_id"]
        for row in read_csv_from_zip(GTFS_PATH, "stop_times.txt")
        if row.get("trip_id") in rail_trip_ids
    }

    stops_by_id = {row["stop_id"]: row for row in read_csv_from_zip(GTFS_PATH, "stops.txt")}
    child_points_by_parent: Dict[str, List[Point]] = defaultdict(list)
    stop_to_complex: Dict[str, str] = {}

    for stop_id in rail_stop_ids:
        row = stops_by_id.get(stop_id)
        if not row:
            continue
        parent = row.get("parent_station") or stop_id
        stop_to_complex[stop_id] = parent
        stop_to_complex[parent] = parent
        if row.get("stop_lat") and row.get("stop_lon"):
            child_points_by_parent[parent].append(
                lonlat_to_xy(float(row["stop_lon"]), float(row["stop_lat"]), lat0)
            )

    stations = []
    station_index_by_id: Dict[str, int] = {}
    for station_id in sorted(stop_to_complex):
        if stop_to_complex[station_id] != station_id:
            continue
        row = stops_by_id.get(station_id, {})
        points = child_points_by_parent.get(station_id, [])
        if row.get("stop_lat") and row.get("stop_lon"):
            point = lonlat_to_xy(float(row["stop_lon"]), float(row["stop_lat"]), lat0)
        elif points:
            point = (
                sum(x for x, _ in points) / len(points),
                sum(y for _, y in points) / len(points),
            )
        else:
            continue
        station_index_by_id[station_id] = len(stations)
        stations.append(
            {
                "id": station_id,
                "name": row.get("stop_name") or station_id,
                "point": point,
                "routes": set(),
            }
        )

    return stations, station_index_by_id, stop_to_complex


def build_routes_and_shapes(lat0: float, bbox: Tuple[float, float, float, float]) -> Tuple[dict, list, dict]:
    route_styles = {}
    for row in read_csv_from_zip(GTFS_PATH, "routes.txt"):
        if row.get("route_type") != "1":
            continue
        route_styles[row["route_id"]] = {
            "color": f"#{row['route_color'] or '808183'}",
            "textColor": f"#{row['route_text_color'] or 'FFFFFF'}",
            "label": row["route_short_name"] or row["route_id"],
        }

    trips_by_id = {}
    shape_counts: Dict[Tuple[str, str], Counter[str]] = {}
    for row in read_csv_from_zip(GTFS_PATH, "trips.txt"):
        route_id = row["route_id"]
        if route_id not in route_styles:
            continue
        trips_by_id[row["trip_id"]] = {
            "route_id": route_id,
            "direction_id": row.get("direction_id", "0"),
            "service_id": row.get("service_id", ""),
        }
        shape_counts.setdefault((route_id, row.get("direction_id", "0")), Counter())[row["shape_id"]] += 1

    selected_shape_ids = {}
    for (route_id, _direction), counter in shape_counts.items():
        for shape_id, _count in counter.most_common(MAX_SHAPES_PER_ROUTE_DIRECTION):
            selected_shape_ids[shape_id] = route_id

    points_by_shape = defaultdict(list)
    for row in read_csv_from_zip(GTFS_PATH, "shapes.txt"):
        shape_id = row["shape_id"]
        if shape_id not in selected_shape_ids:
            continue
        point = lonlat_to_xy(float(row["shape_pt_lon"]), float(row["shape_pt_lat"]), lat0)
        points_by_shape[shape_id].append((int(row["shape_pt_sequence"]), point))

    shapes = []
    for shape_id, route_id in selected_shape_ids.items():
        points = [point for _, point in sorted(points_by_shape.get(shape_id, []))]
        points = simplify_polyline(points, 90.0)
        if len(points) < 2 or not bbox_intersects(bounds_of_points(points), bbox):
            continue
        shapes.append(
            {
                "routeId": route_id,
                "color": route_styles[route_id]["color"],
                "textColor": route_styles[route_id]["textColor"],
                "label": route_styles[route_id]["label"],
                "points": round_path(points),
            }
        )
    return route_styles, shapes, trips_by_id


def build_reference_route_shapes(
    lat0: float,
    bbox: Tuple[float, float, float, float],
    route_type: str,
) -> list:
    route_styles = {}
    for row in read_csv_from_zip(GTFS_PATH, "routes.txt"):
        if row.get("route_type") != route_type:
            continue
        route_styles[row["route_id"]] = {
            "color": f"#{row['route_color'] or 'A9B4C0'}",
            "textColor": f"#{row['route_text_color'] or '17304D'}",
            "label": row["route_short_name"] or row["route_id"],
        }

    shape_counts: Dict[Tuple[str, str], Counter[str]] = {}
    for row in read_csv_from_zip(GTFS_PATH, "trips.txt"):
        route_id = row["route_id"]
        if route_id not in route_styles:
            continue
        shape_counts.setdefault((route_id, row.get("direction_id", "0")), Counter())[row["shape_id"]] += 1

    selected_shape_ids = {}
    for (route_id, _direction), counter in shape_counts.items():
        for shape_id, _count in counter.most_common(MAX_REFERENCE_SHAPES_PER_ROUTE_DIRECTION):
            selected_shape_ids[shape_id] = route_id

    points_by_shape = defaultdict(list)
    for row in read_csv_from_zip(GTFS_PATH, "shapes.txt"):
        shape_id = row["shape_id"]
        if shape_id not in selected_shape_ids:
            continue
        point = lonlat_to_xy(float(row["shape_pt_lon"]), float(row["shape_pt_lat"]), lat0)
        points_by_shape[shape_id].append((int(row["shape_pt_sequence"]), point))

    shapes = []
    for shape_id, route_id in selected_shape_ids.items():
        points = [point for _, point in sorted(points_by_shape.get(shape_id, []))]
        points = simplify_polyline(points, 180.0)
        if len(points) < 2 or not bbox_intersects(bounds_of_points(points), bbox):
            continue
        shapes.append(
            {
                "routeId": route_id,
                "color": route_styles[route_id]["color"],
                "textColor": route_styles[route_id]["textColor"],
                "label": route_styles[route_id]["label"],
                "points": round_path(points),
            }
        )
    return shapes


def build_route_waits(trips_by_id: dict) -> Dict[str, float]:
    departures_by_route_service: Dict[Tuple[str, str], List[int]] = defaultdict(list)
    current_trip_id = None
    first_departure = None

    for row in read_csv_from_zip(GTFS_PATH, "stop_times.txt"):
        trip_id = row["trip_id"]
        stop_sequence = int(row["stop_sequence"])
        if trip_id != current_trip_id:
            if current_trip_id and first_departure is not None and current_trip_id in trips_by_id:
                trip = trips_by_id[current_trip_id]
                departures_by_route_service[(trip["route_id"], trip["service_id"])].append(first_departure)
            current_trip_id = trip_id
            first_departure = parse_gtfs_time(row["departure_time"]) if stop_sequence == 1 else None
        elif stop_sequence == 1 and first_departure is None:
            first_departure = parse_gtfs_time(row["departure_time"])

    if current_trip_id and first_departure is not None and current_trip_id in trips_by_id:
        trip = trips_by_id[current_trip_id]
        departures_by_route_service[(trip["route_id"], trip["service_id"])].append(first_departure)

    waits_by_route: Dict[str, List[float]] = defaultdict(list)
    for (route_id, _service_id), departures in departures_by_route_service.items():
        departures = sorted(set(departures))
        gaps = [
            (departures[i + 1] - departures[i]) / 60.0
            for i in range(len(departures) - 1)
            if 2 * 60 <= departures[i + 1] - departures[i] <= 30 * 60
        ]
        if gaps:
            waits_by_route[route_id].append(statistics.median(gaps) / 2.0)

    route_waits: Dict[str, float] = {}
    for route_id, waits in waits_by_route.items():
        route_waits[route_id] = round(clamp(statistics.median(waits), 1.5, 8.0), 2)
    return route_waits


def build_graph(
    stations: list,
    station_index_by_id: Dict[str, int],
    stop_to_complex: Dict[str, str],
    trips_by_id: dict,
    route_waits: Dict[str, float],
) -> Tuple[list, list, list]:
    durations_by_edge: Dict[Tuple[int, int, str], List[float]] = defaultdict(list)
    current_trip_id = None
    current_rows: List[dict] = []

    def process_trip(trip_id: str, rows: List[dict]) -> None:
        trip = trips_by_id.get(trip_id)
        if not trip or len(rows) < 2:
            return
        route_id = trip["route_id"]
        ordered = sorted(rows, key=lambda row: int(row["stop_sequence"]))
        for row in ordered:
            stop_id = row["stop_id"]
            complex_id = stop_to_complex.get(stop_id)
            if complex_id in station_index_by_id:
                stations[station_index_by_id[complex_id]]["routes"].add(route_id)
        for prev, nxt in zip(ordered, ordered[1:]):
            from_complex = stop_to_complex.get(prev["stop_id"])
            to_complex = stop_to_complex.get(nxt["stop_id"])
            if not from_complex or not to_complex or from_complex == to_complex:
                continue
            if from_complex not in station_index_by_id or to_complex not in station_index_by_id:
                continue
            duration_seconds = parse_gtfs_time(nxt["arrival_time"]) - parse_gtfs_time(prev["departure_time"])
            if 20 <= duration_seconds <= 1800:
                from_index = station_index_by_id[from_complex]
                to_index = station_index_by_id[to_complex]
                durations_by_edge[(from_index, to_index, route_id)].append(duration_seconds / 60.0)

    for row in read_csv_from_zip(GTFS_PATH, "stop_times.txt"):
        trip_id = row["trip_id"]
        if current_trip_id is None:
            current_trip_id = trip_id
        if trip_id != current_trip_id:
            process_trip(current_trip_id, current_rows)
            current_trip_id = trip_id
            current_rows = []
        current_rows.append(row)
    if current_trip_id and current_rows:
        process_trip(current_trip_id, current_rows)

    route_states = []
    state_index_by_key: Dict[Tuple[int, str], int] = {}
    station_states: List[List[int]] = [[] for _ in stations]
    for station_index, station in enumerate(stations):
        for route_id in sorted(station["routes"]):
            state_index_by_key[(station_index, route_id)] = len(route_states)
            route_states.append({"stationIndex": station_index, "routeId": route_id})
            station_states[station_index].append(state_index_by_key[(station_index, route_id)])

    adjacency = [dict() for _ in route_states]
    for (from_station, to_station, route_id), durations in durations_by_edge.items():
        from_state = state_index_by_key.get((from_station, route_id))
        to_state = state_index_by_key.get((to_station, route_id))
        if from_state is None or to_state is None:
            continue
        weight = round(statistics.median(durations), 2)
        existing = adjacency[from_state].get(to_state)
        if existing is None or weight < existing:
            adjacency[from_state][to_state] = weight

    for station_index, state_indexes in enumerate(station_states):
        for from_state in state_indexes:
            for to_state in state_indexes:
                if from_state == to_state:
                    continue
                to_route = route_states[to_state]["routeId"]
                transfer_cost = round(TRANSFER_PENALTY + route_waits.get(to_route, DEFAULT_BOARD_WAIT), 2)
                existing = adjacency[from_state].get(to_state)
                if existing is None or transfer_cost < existing:
                    adjacency[from_state][to_state] = transfer_cost

    for i, source in enumerate(stations):
        sx, sy = source["point"]
        for j in range(i + 1, len(stations)):
            tx, ty = stations[j]["point"]
            distance = math.hypot(tx - sx, ty - sy)
            if distance > INTER_COMPLEX_WALK_RADIUS:
                continue
            walk_minutes = distance / WALK_METERS_PER_MINUTE + INTER_COMPLEX_WALK_PENALTY
            for from_state in station_states[i]:
                for to_state in station_states[j]:
                    to_route = route_states[to_state]["routeId"]
                    from_route = route_states[from_state]["routeId"]
                    forward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(to_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    backward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(from_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    existing_forward = adjacency[from_state].get(to_state)
                    existing_backward = adjacency[to_state].get(from_state)
                    if existing_forward is None or forward_cost < existing_forward:
                        adjacency[from_state][to_state] = forward_cost
                    if existing_backward is None or backward_cost < existing_backward:
                        adjacency[to_state][from_state] = backward_cost

    return (
        route_states,
        station_states,
        [
            [[to_index, weight] for to_index, weight in sorted(edges.items())]
            for edges in adjacency
        ],
    )


def build_grid_cells(polygons: MultiPolygon, stations: list, bbox: Tuple[float, float, float, float]) -> Tuple[list, list]:
    min_x, min_y, max_x, max_y = bbox
    cell_w = (max_x - min_x) / GRID_COLS
    cell_h = (max_y - min_y) / GRID_ROWS
    mask = []
    cells = []
    station_points = [station["point"] for station in stations]
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            x = min_x + (col + 0.5) * cell_w
            y = min_y + (row + 0.5) * cell_h
            point = (x, y)
            if not point_in_multipolygon(point, polygons):
                mask.append(-1)
                continue
            ranked = sorted(
                (
                    (
                        station_index,
                        round(
                            math.hypot(station_point[0] - x, station_point[1] - y) / ACCESS_WALK_METERS_PER_MINUTE
                            + STATION_ACCESS_PENALTY,
                            2,
                        ),
                    )
                    for station_index, station_point in enumerate(station_points)
                ),
                key=lambda item: item[1],
            )[:CELL_NEAREST_STATIONS]
            cells.append(
                {
                    "col": col,
                    "row": row,
                    "point": round_point(point),
                    "access": [[station_index, walk_minutes] for station_index, walk_minutes in ranked],
                }
            )
            mask.append(len(cells) - 1)
    return cells, mask


def route_mode(route_type: str) -> str:
    if route_type == "1":
        return "rail"
    if route_type == "2":
        return "commuter_rail"
    if route_type == "3":
        return "bus"
    return "transit"


def namespaced(feed: dict, value: str) -> str:
    return f"{feed['id']}:{value}"


def read_feed_csv(feed: dict, member: str) -> Iterable[dict]:
    return read_csv_from_zip(feed["path"], member)


def build_spatial_bins(points: Sequence[Point], cell_size: float) -> dict:
    bins = defaultdict(list)
    for index, (x, y) in enumerate(points):
        bins[(math.floor(x / cell_size), math.floor(y / cell_size))].append(index)
    return bins


def nearby_point_indexes(
    point: Point,
    points: Sequence[Point],
    bins: dict,
    cell_size: float,
    radius: float,
) -> Iterable[int]:
    cx = math.floor(point[0] / cell_size)
    cy = math.floor(point[1] / cell_size)
    bin_radius = max(1, math.ceil(radius / cell_size))
    radius_sq = radius * radius
    for bx in range(cx - bin_radius, cx + bin_radius + 1):
        for by in range(cy - bin_radius, cy + bin_radius + 1):
            for index in bins.get((bx, by), []):
                candidate = points[index]
                dx = candidate[0] - point[0]
                dy = candidate[1] - point[1]
                if dx * dx + dy * dy <= radius_sq:
                    yield index


def nearest_point_indexes(
    point: Point,
    points: Sequence[Point],
    bins: dict,
    cell_size: float,
    limit: int,
) -> list:
    cx = math.floor(point[0] / cell_size)
    cy = math.floor(point[1] / cell_size)
    seen = set()
    ranked = []
    radius = 0
    while len(ranked) < limit and radius < 80:
        for bx in range(cx - radius, cx + radius + 1):
            for by in range(cy - radius, cy + radius + 1):
                if bx not in (cx - radius, cx + radius) and by not in (cy - radius, cy + radius):
                    continue
                for index in bins.get((bx, by), []):
                    if index in seen:
                        continue
                    seen.add(index)
                    ranked.append((index, math.hypot(points[index][0] - point[0], points[index][1] - point[1])))
        radius += 1
    return [index for index, _ in sorted(ranked, key=lambda item: item[1])[:limit]]


def build_multimodal_data(lat0: float, bbox: Tuple[float, float, float, float]) -> Tuple[dict, list, list, list, list, list, list, dict, list, list, list, dict]:
    route_styles: Dict[str, dict] = {}
    trips_by_id = {}
    used_stop_ids_by_feed: Dict[str, set[str]] = defaultdict(set)
    shape_counts: Dict[Tuple[str, str, str], Counter[str]] = {}
    route_mode_by_id = {}

    for feed in GTFS_FEEDS:
        print(f"Reading {feed['name']} routes and trips")
        allowed_original_routes = {}
        for row in read_feed_csv(feed, "routes.txt"):
            route_type = row.get("route_type", "")
            if route_type not in feed["route_types"]:
                continue
            route_id = namespaced(feed, row["route_id"])
            mode = route_mode(route_type)
            route_mode_by_id[route_id] = mode
            route_styles[route_id] = {
                "color": f"#{row['route_color'] or ('A9B4C0' if mode == 'bus' else '808183')}",
                "textColor": f"#{row['route_text_color'] or 'FFFFFF'}",
                "label": row["route_short_name"] or row["route_id"],
                "agency": feed["name"],
                "mode": mode,
            }
            allowed_original_routes[row["route_id"]] = route_id

        for row in read_feed_csv(feed, "trips.txt"):
            route_id = allowed_original_routes.get(row["route_id"])
            if not route_id:
                continue
            trip_id = namespaced(feed, row["trip_id"])
            trips_by_id[trip_id] = {
                "route_id": route_id,
                "direction_id": row.get("direction_id", "0"),
                "service_id": row.get("service_id", ""),
                "feed_id": feed["id"],
            }
            shape_id = row.get("shape_id")
            if shape_id:
                shape_counts.setdefault((feed["id"], route_id, row.get("direction_id", "0")), Counter())[shape_id] += 1

        print(f"Reading {feed['name']} stop usage")
        for row in read_feed_csv(feed, "stop_times.txt"):
            trip_id = namespaced(feed, row["trip_id"])
            if trip_id in trips_by_id:
                used_stop_ids_by_feed[feed["id"]].add(row["stop_id"])

    print("Building combined stop list")
    stops_by_feed = {
        feed["id"]: {row["stop_id"]: row for row in read_feed_csv(feed, "stops.txt")}
        for feed in GTFS_FEEDS
    }
    feed_by_id = {feed["id"]: feed for feed in GTFS_FEEDS}
    stop_to_complex: Dict[str, str] = {}
    complex_points: Dict[str, List[Point]] = defaultdict(list)
    complex_names: Dict[str, str] = {}

    for feed_id, stop_ids in used_stop_ids_by_feed.items():
        feed = feed_by_id[feed_id]
        stops_by_id = stops_by_feed[feed_id]
        for stop_id in stop_ids:
            row = stops_by_id.get(stop_id)
            if not row:
                continue
            parent = row.get("parent_station") or stop_id
            complex_id = namespaced(feed, parent)
            stop_to_complex[namespaced(feed, stop_id)] = complex_id
            stop_to_complex[complex_id] = complex_id
            complex_names.setdefault(complex_id, row.get("stop_name") or stop_id)
            if row.get("stop_lon") and row.get("stop_lat"):
                complex_points[complex_id].append(
                    lonlat_to_xy(float(row["stop_lon"]), float(row["stop_lat"]), lat0)
                )
            parent_row = stops_by_id.get(parent)
            if parent_row and parent_row.get("stop_name"):
                complex_names[complex_id] = parent_row["stop_name"]

    stations = []
    station_index_by_id: Dict[str, int] = {}
    for complex_id in sorted(complex_points):
        points = complex_points[complex_id]
        if not points:
            continue
        point = (
            sum(x for x, _ in points) / len(points),
            sum(y for _, y in points) / len(points),
        )
        station_index_by_id[complex_id] = len(stations)
        stations.append(
            {
                "id": complex_id,
                "name": complex_names.get(complex_id, complex_id),
                "point": point,
                "routes": set(),
            }
        )

    selected_shape_ids = {}
    for (feed_id, route_id, _direction), counter in shape_counts.items():
        max_shapes = MAX_REFERENCE_SHAPES_PER_ROUTE_DIRECTION if route_mode_by_id.get(route_id) == "bus" else MAX_SHAPES_PER_ROUTE_DIRECTION
        for shape_id, _count in counter.most_common(max_shapes):
            selected_shape_ids[(feed_id, shape_id)] = route_id

    points_by_shape = defaultdict(list)
    for feed in GTFS_FEEDS:
        for row in read_feed_csv(feed, "shapes.txt"):
            key = (feed["id"], row["shape_id"])
            if key not in selected_shape_ids:
                continue
            point = lonlat_to_xy(float(row["shape_pt_lon"]), float(row["shape_pt_lat"]), lat0)
            points_by_shape[key].append((int(row["shape_pt_sequence"]), point))

    route_shapes = []
    bus_route_shapes = []
    for key, route_id in selected_shape_ids.items():
        points = [point for _, point in sorted(points_by_shape.get(key, []))]
        mode = route_mode_by_id.get(route_id, "transit")
        points = simplify_polyline(points, 180.0 if mode == "bus" else 90.0)
        if len(points) < 2 or not bbox_intersects(bounds_of_points(points), bbox):
            continue
        shape = {
            "routeId": route_id,
            "color": route_styles[route_id]["color"],
            "textColor": route_styles[route_id]["textColor"],
            "label": route_styles[route_id]["label"],
            "agency": route_styles[route_id]["agency"],
            "mode": mode,
            "points": round_path(points),
        }
        if mode == "bus":
            bus_route_shapes.append(shape)
        else:
            route_shapes.append(shape)

    print("Building route waits")
    route_waits = build_multimodal_route_waits(trips_by_id)
    print("Building routing graph")
    route_states, station_states, adjacency = build_multimodal_graph(
        stations,
        station_index_by_id,
        stop_to_complex,
        trips_by_id,
        route_waits,
    )

    return (
        route_styles,
        route_shapes,
        bus_route_shapes,
        stations,
        route_states,
        station_states,
        adjacency,
        route_waits,
        trips_by_id,
        [],
        [],
        stop_to_complex,
    )


def build_multimodal_route_waits(trips_by_id: dict) -> Dict[str, float]:
    departures_by_route_service: Dict[Tuple[str, str], List[int]] = defaultdict(list)
    feeds_by_id = {feed["id"]: feed for feed in GTFS_FEEDS}

    for feed_id, feed in feeds_by_id.items():
        current_trip_id = None
        first_departure = None
        for row in read_feed_csv(feed, "stop_times.txt"):
            trip_id = namespaced(feed, row["trip_id"])
            stop_sequence = int(row["stop_sequence"])
            if trip_id != current_trip_id:
                if current_trip_id and first_departure is not None and current_trip_id in trips_by_id:
                    trip = trips_by_id[current_trip_id]
                    departures_by_route_service[(trip["route_id"], trip["service_id"])].append(first_departure)
                current_trip_id = trip_id
                first_departure = parse_gtfs_time(row["departure_time"]) if stop_sequence == 1 else None
            elif stop_sequence == 1 and first_departure is None:
                first_departure = parse_gtfs_time(row["departure_time"])
        if current_trip_id and first_departure is not None and current_trip_id in trips_by_id:
            trip = trips_by_id[current_trip_id]
            departures_by_route_service[(trip["route_id"], trip["service_id"])].append(first_departure)

    waits_by_route: Dict[str, List[float]] = defaultdict(list)
    for (route_id, _service_id), departures in departures_by_route_service.items():
        departures = sorted(set(departures))
        gaps = [
            (departures[i + 1] - departures[i]) / 60.0
            for i in range(len(departures) - 1)
            if 3 * 60 <= departures[i + 1] - departures[i] <= 120 * 60
        ]
        if gaps:
            waits_by_route[route_id].append(statistics.median(gaps) / 2.0)

    return {
        route_id: round(clamp(statistics.median(waits), 1.5, 30.0), 2)
        for route_id, waits in waits_by_route.items()
    }


def build_multimodal_graph(
    stations: list,
    station_index_by_id: Dict[str, int],
    stop_to_complex: Dict[str, str],
    trips_by_id: dict,
    route_waits: Dict[str, float],
) -> Tuple[list, list, list]:
    durations_by_edge: Dict[Tuple[int, int, str], List[float]] = defaultdict(list)

    def process_trip(trip_id: str, rows: List[dict]) -> None:
        trip = trips_by_id.get(trip_id)
        if not trip or len(rows) < 2:
            return
        route_id = trip["route_id"]
        ordered = sorted(rows, key=lambda row: int(row["stop_sequence"]))
        for row in ordered:
            complex_id = stop_to_complex.get(row["_stop_id"])
            if complex_id in station_index_by_id:
                stations[station_index_by_id[complex_id]]["routes"].add(route_id)
        for prev, nxt in zip(ordered, ordered[1:]):
            from_complex = stop_to_complex.get(prev["_stop_id"])
            to_complex = stop_to_complex.get(nxt["_stop_id"])
            if not from_complex or not to_complex or from_complex == to_complex:
                continue
            if from_complex not in station_index_by_id or to_complex not in station_index_by_id:
                continue
            duration_seconds = parse_gtfs_time(nxt["arrival_time"]) - parse_gtfs_time(prev["departure_time"])
            if 20 <= duration_seconds <= 7200:
                from_index = station_index_by_id[from_complex]
                to_index = station_index_by_id[to_complex]
                durations_by_edge[(from_index, to_index, route_id)].append(duration_seconds / 60.0)

    for feed in GTFS_FEEDS:
        current_trip_id = None
        current_rows: List[dict] = []
        for row in read_feed_csv(feed, "stop_times.txt"):
            trip_id = namespaced(feed, row["trip_id"])
            if trip_id not in trips_by_id:
                continue
            row = dict(row)
            row["_stop_id"] = namespaced(feed, row["stop_id"])
            if current_trip_id is None:
                current_trip_id = trip_id
            if trip_id != current_trip_id:
                process_trip(current_trip_id, current_rows)
                current_trip_id = trip_id
                current_rows = []
            current_rows.append(row)
        if current_trip_id and current_rows:
            process_trip(current_trip_id, current_rows)

    route_states = []
    state_index_by_key: Dict[Tuple[int, str], int] = {}
    station_states: List[List[int]] = [[] for _ in stations]
    for station_index, station in enumerate(stations):
        for route_id in sorted(station["routes"]):
            state_index_by_key[(station_index, route_id)] = len(route_states)
            route_states.append({"stationIndex": station_index, "routeId": route_id})
            station_states[station_index].append(state_index_by_key[(station_index, route_id)])

    adjacency = [dict() for _ in route_states]
    for (from_station, to_station, route_id), durations in durations_by_edge.items():
        from_state = state_index_by_key.get((from_station, route_id))
        to_state = state_index_by_key.get((to_station, route_id))
        if from_state is None or to_state is None:
            continue
        weight = round(statistics.median(durations), 2)
        existing = adjacency[from_state].get(to_state)
        if existing is None or weight < existing:
            adjacency[from_state][to_state] = weight

    for station_index, state_indexes in enumerate(station_states):
        for from_state in state_indexes:
            for to_state in state_indexes:
                if from_state == to_state:
                    continue
                to_route = route_states[to_state]["routeId"]
                transfer_cost = round(TRANSFER_PENALTY + route_waits.get(to_route, DEFAULT_BOARD_WAIT), 2)
                existing = adjacency[from_state].get(to_state)
                if existing is None or transfer_cost < existing:
                    adjacency[from_state][to_state] = transfer_cost

    station_points = [station["point"] for station in stations]
    bins = build_spatial_bins(station_points, INTER_COMPLEX_WALK_RADIUS)
    for i, source in enumerate(stations):
        for j in nearby_point_indexes(source["point"], station_points, bins, INTER_COMPLEX_WALK_RADIUS, INTER_COMPLEX_WALK_RADIUS):
            if j <= i:
                continue
            distance_m = math.hypot(station_points[j][0] - source["point"][0], station_points[j][1] - source["point"][1])
            walk_minutes = distance_m / WALK_METERS_PER_MINUTE + INTER_COMPLEX_WALK_PENALTY
            for from_state in station_states[i]:
                for to_state in station_states[j]:
                    to_route = route_states[to_state]["routeId"]
                    from_route = route_states[from_state]["routeId"]
                    forward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(to_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    backward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(from_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    existing_forward = adjacency[from_state].get(to_state)
                    existing_backward = adjacency[to_state].get(from_state)
                    if existing_forward is None or forward_cost < existing_forward:
                        adjacency[from_state][to_state] = forward_cost
                    if existing_backward is None or backward_cost < existing_backward:
                        adjacency[to_state][from_state] = backward_cost

    metra_station_indices = [
        i
        for i, state_indexes in enumerate(station_states)
        if any(route_states[state]["routeId"].startswith("metra:") for state in state_indexes)
    ]
    metra_points = [stations[i]["point"] for i in metra_station_indices]
    metra_bins = build_spatial_bins(metra_points, METRA_HUB_WALK_RADIUS)
    for a, i in enumerate(metra_station_indices):
        source_point = metra_points[a]
        for b in nearby_point_indexes(source_point, metra_points, metra_bins, METRA_HUB_WALK_RADIUS, METRA_HUB_WALK_RADIUS):
            j = metra_station_indices[b]
            if j <= i:
                continue
            distance_m = math.hypot(stations[j]["point"][0] - source_point[0], stations[j]["point"][1] - source_point[1])
            if distance_m <= INTER_COMPLEX_WALK_RADIUS:
                continue  # already bridged by the general pass above
            walk_minutes = distance_m / WALK_METERS_PER_MINUTE + INTER_COMPLEX_WALK_PENALTY
            metra_from_states = [s for s in station_states[i] if route_states[s]["routeId"].startswith("metra:")]
            metra_to_states = [s for s in station_states[j] if route_states[s]["routeId"].startswith("metra:")]
            for from_state in metra_from_states:
                for to_state in metra_to_states:
                    to_route = route_states[to_state]["routeId"]
                    from_route = route_states[from_state]["routeId"]
                    forward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(to_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    backward_cost = round(
                        walk_minutes + INTER_COMPLEX_TRANSFER_PENALTY + route_waits.get(from_route, DEFAULT_BOARD_WAIT),
                        2,
                    )
                    existing_forward = adjacency[from_state].get(to_state)
                    existing_backward = adjacency[to_state].get(from_state)
                    if existing_forward is None or forward_cost < existing_forward:
                        adjacency[from_state][to_state] = forward_cost
                    if existing_backward is None or backward_cost < existing_backward:
                        adjacency[to_state][from_state] = backward_cost

    return (
        route_states,
        station_states,
        [
            [[to_index, weight] for to_index, weight in sorted(edges.items())]
            for edges in adjacency
        ],
    )


def build_grid_cells_indexed(polygons: MultiPolygon, stations: list, bbox: Tuple[float, float, float, float]) -> Tuple[list, list]:
    min_x, min_y, max_x, max_y = bbox
    cell_w = (max_x - min_x) / GRID_COLS
    cell_h = (max_y - min_y) / GRID_ROWS
    mask = []
    cells = []
    station_points = [station["point"] for station in stations]
    station_bins = build_spatial_bins(station_points, 1400.0)
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            x = min_x + (col + 0.5) * cell_w
            y = min_y + (row + 0.5) * cell_h
            point = (x, y)
            if not point_in_multipolygon(point, polygons):
                mask.append(-1)
                continue
            ranked = [
                (
                    station_index,
                    round(
                        math.hypot(station_points[station_index][0] - x, station_points[station_index][1] - y)
                        / ACCESS_WALK_METERS_PER_MINUTE
                        + STATION_ACCESS_PENALTY,
                        2,
                    ),
                )
                for station_index in nearest_point_indexes(point, station_points, station_bins, 1400.0, CELL_NEAREST_STATIONS)
            ]
            cells.append(
                {
                    "col": col,
                    "row": row,
                    "point": round_point(point),
                    "access": [[station_index, walk_minutes] for station_index, walk_minutes in ranked],
                }
            )
            mask.append(len(cells) - 1)
    return cells, mask


def build_grid_cells_service_area(
    neighborhood_polygons: MultiPolygon,
    stations: list,
    bbox: Tuple[float, float, float, float],
) -> Tuple[list, list]:
    min_x, min_y, max_x, max_y = bbox
    cell_w = (max_x - min_x) / GRID_COLS
    cell_h = (max_y - min_y) / GRID_ROWS
    mask = []
    cells = []
    station_points = [station["point"] for station in stations]
    station_bins = build_spatial_bins(station_points, 1400.0)
    neighborhood_boxes = [bounds_of_ring(polygon[0]) for polygon in neighborhood_polygons if polygon]

    def in_neighborhood(point: Point) -> bool:
        return any(
            box[0] <= point[0] <= box[2]
            and box[1] <= point[1] <= box[3]
            and point_in_polygon(point, polygon)
            for polygon, box in zip(neighborhood_polygons, neighborhood_boxes)
        )

    def in_transit_service_area(point: Point) -> bool:
        return any(
            True
            for _ in nearby_point_indexes(
                point,
                station_points,
                station_bins,
                1400.0,
                STATION_SERVICE_AREA_RADIUS,
            )
        )

    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            x = min_x + (col + 0.5) * cell_w
            y = min_y + (row + 0.5) * cell_h
            point = (x, y)
            if not in_neighborhood(point) and not in_transit_service_area(point):
                mask.append(-1)
                continue
            ranked = [
                (
                    station_index,
                    round(
                        math.hypot(station_points[station_index][0] - x, station_points[station_index][1] - y)
                        / ACCESS_WALK_METERS_PER_MINUTE
                        + STATION_ACCESS_PENALTY,
                        2,
                    ),
                )
                for station_index in nearest_point_indexes(point, station_points, station_bins, 1400.0, CELL_NEAREST_STATIONS)
            ]
            cells.append(
                {
                    "col": col,
                    "row": row,
                    "point": round_point(point),
                    "access": [[station_index, walk_minutes] for station_index, walk_minutes in ranked],
                }
            )
            mask.append(len(cells) - 1)
    return cells, mask


def main() -> None:
    ensure_data_files()
    borough_payload = load_json(NEIGHBORHOODS_PATH)
    lat0 = average_borough_latitude(borough_payload)
    boroughs, neighborhood_polygons = extract_boroughs(borough_payload, lat0)
    print(f"Loaded {len(boroughs)} neighborhoods")
    (
        route_styles,
        route_shapes,
        bus_route_shapes,
        stations,
        route_states,
        station_states,
        adjacency,
        route_waits,
        _trips_by_id,
        _unused_a,
        _unused_b,
        _stop_to_complex,
    ) = build_multimodal_data(lat0, expand_bbox(bounds_of_multipolygon(neighborhood_polygons), 50_000.0))
    print(f"Built multimodal network with {len(stations)} stops and {len(route_states)} route states")
    bbox = combine_bboxes(
        bounds_of_multipolygon(neighborhood_polygons),
        expand_bbox(bounds_of_points([station["point"] for station in stations]), 3200.0),
    )
    external_land = build_external_land_polygons(lat0, bbox, neighborhood_polygons)
    land_mask = [
        [round_path(ring) for ring in polygon]
        for polygon in neighborhood_polygons
    ]
    land_mask.extend(external_land)
    parks = extract_parks(lat0, bbox)
    streets = extract_streets(lat0, bbox)
    cells, mask = build_grid_cells_service_area(neighborhood_polygons, stations, bbox)
    print(f"Built {len(cells)} grid cells")

    output = {
        "meta": {
            "lat0": round(lat0, 6),
            "bounds": [round(value, 1) for value in bbox],
            "gridCols": GRID_COLS,
            "gridRows": GRID_ROWS,
            "walkMetersPerMinute": WALK_METERS_PER_MINUTE,
            "accessWalkMetersPerMinute": ACCESS_WALK_METERS_PER_MINUTE,
            "stationAccessPenalty": STATION_ACCESS_PENALTY,
            "originStationCount": ORIGIN_NEAREST_STATIONS,
            "cellNearestStations": CELL_NEAREST_STATIONS,
            "defaultBoardWait": DEFAULT_BOARD_WAIT,
            "transferPenalty": TRANSFER_PENALTY,
            "interComplexTransferPenalty": INTER_COMPLEX_TRANSFER_PENALTY,
        },
        "boroughs": boroughs,
        "landMask": land_mask,
        "externalLand": external_land,
        "parks": parks,
        "streets": streets,
        "busRoutes": bus_route_shapes,
        "routes": route_shapes,
        "stations": [
            {
                "id": station["id"],
                "name": station["name"],
                "point": round_point(station["point"]),
                "routes": sorted(station["routes"]),
            }
            for station in stations
        ],
        "routeStates": route_states,
        "stationStates": station_states,
        "routeWaits": route_waits,
        "adjacency": adjacency,
        "cells": cells,
        "mask": mask,
        "routeStyles": route_styles,
    }

    SITE_DATA_PATH.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {SITE_DATA_PATH}")


if __name__ == "__main__":
    main()

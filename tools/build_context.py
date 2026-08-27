#!/usr/bin/env python3
"""Build the map's context layers: data/water.geojson and data/parks.geojson.

Separate from build_data.py because these come from bulky third-party sources
that rarely change, whereas build_data.py runs every time the metro history is
edited. Run this only when refreshing the underlying context data.

Sources
  water  data/raw_data/PLAN_EAU.kml      Paris open data, PLAN_EAU (ODbL)
  parks  data/raw_data/parks_paris.geojson  opendata.paris.fr espaces_verts (ODbL)
         data/raw_data/parks_osm.json       OpenStreetMap via Overpass (ODbL)
"""

import json
import os
import re
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw_data")
OUT = os.path.join(ROOT, "data")

# The metro network spans 2.228-2.465 E, 48.769-48.946 N, and the map is fitted
# to that. On a wide desktop the visible strip is roughly 0.10 degrees wider on
# each side; this box clears even an ultrawide window, so nothing that should be
# on screen gets trimmed. Geometry is clipped to it rather than kept or dropped
# whole, so reaching this far costs little: the Seine's downstream arm runs out
# to Mantes at 1.51 E and is simply cut here.
BBOX = (1.95, 48.60, 2.78, 49.14)

KML_NS = "{http://www.opengis.net/kml/2.2}"


def in_bbox(ring):
    """True if the ring's own bounding box overlaps the area we care about."""
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return not (max(xs) < BBOX[0] or min(xs) > BBOX[2] or
                max(ys) < BBOX[1] or min(ys) > BBOX[3])


def clip_ring(ring):
    """Sutherland-Hodgman against the bounding box.

    Whole-polygon filtering has to choose between a visible gap and carrying
    geometry that is never on screen: the Seine's western reach is one polygon
    spanning 1.51 to 2.16 E, so any cutoff that excludes Mantes also excluded
    the part of the river above Paris. Clipping keeps the visible half and
    discards the rest. The cut edge runs along the box, which is well outside
    the frame, so it is never seen.
    """
    x0, y0, x1, y1 = BBOX

    def cut(points, inside, crossing):
        out = []
        if not points:
            return out
        prev = points[-1]
        for cur in points:
            if inside(cur):
                if not inside(prev):
                    out.append(crossing(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(crossing(prev, cur))
            prev = cur
        return out

    def at_x(a, b, x):
        t = (x - a[0]) / (b[0] - a[0])
        return [x, a[1] + t * (b[1] - a[1])]

    def at_y(a, b, y):
        t = (y - a[1]) / (b[1] - a[1])
        return [a[0] + t * (b[0] - a[0]), y]

    # Drop the repeated closing vertex; the algorithm treats the ring as closed.
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else list(ring)

    pts = cut(pts, lambda p: p[0] >= x0, lambda a, b: at_x(a, b, x0))
    pts = cut(pts, lambda p: p[0] <= x1, lambda a, b: at_x(a, b, x1))
    pts = cut(pts, lambda p: p[1] >= y0, lambda a, b: at_y(a, b, y0))
    pts = cut(pts, lambda p: p[1] <= y1, lambda a, b: at_y(a, b, y1))

    if len(pts) < 3:
        return []
    return pts + [pts[0]]


def parse_coords(text):
    out = []
    for chunk in text.split():
        parts = chunk.split(",")
        if len(parts) >= 2:
            out.append([float(parts[0]), float(parts[1])])
    return out


def polygon_rings(poly):
    """Outer boundary first, then any inner boundaries (islands)."""
    rings = []
    outer = poly.find(f"{KML_NS}outerBoundaryIs/{KML_NS}LinearRing/{KML_NS}coordinates")
    if outer is None or not outer.text:
        return rings
    rings.append(parse_coords(outer.text))
    for inner in poly.findall(f"{KML_NS}innerBoundaryIs/{KML_NS}LinearRing/{KML_NS}coordinates"):
        if inner.text:
            rings.append(parse_coords(inner.text))
    return rings


def build_water():
    tree = ET.parse(os.path.join(RAW, "PLAN_EAU.kml"))
    features = []
    kept = dropped = 0

    for placemark in tree.iter(f"{KML_NS}Placemark"):
        name = ""
        for field in placemark.iter(f"{KML_NS}SimpleData"):
            if field.get("name") == "L_EAU":
                name = (field.text or "").strip()

        polygons = []
        for poly in placemark.iter(f"{KML_NS}Polygon"):
            rings = polygon_rings(poly)
            if not rings or not in_bbox(rings[0]):
                continue
            clipped = [r for r in (clip_ring(r) for r in rings) if r]
            if clipped:
                polygons.append(clipped)

        if not polygons:
            dropped += 1
            continue
        kept += 1
        features.append({
            "type": "Feature",
            "properties": {"name": name},
            "geometry": {"type": "MultiPolygon", "coordinates": polygons},
        })

    print(f"  water: kept {kept} placemarks, dropped {dropped} outside the bbox")
    names = sorted({f["properties"]["name"] for f in features if f["properties"]["name"]})
    print(f"         {len(names)} named bodies: {', '.join(names[:9])}...")
    return {"type": "FeatureCollection", "features": features}


def clean_park_name(name):
    """The city dataset is all-caps; OSM is already title case."""
    if not name or not name.isupper():
        return name
    name = name.title()
    # Fix the particles and elisions that .title() mangles.
    name = re.sub(r"\b(De|Du|Des|La|Le|Les|Et|D|L|Sur|Aux|Au)\b",
                  lambda m: m.group(1).lower(), name)
    name = re.sub(r"\bD'(\w)", lambda m: "d'" + m.group(1), name)
    name = re.sub(r"\bL'(\w)", lambda m: "l'" + m.group(1), name)
    return name[0].upper() + name[1:]


def build_parks():
    features = []

    with open(os.path.join(RAW, "parks_paris.geojson"), encoding="utf-8") as fh:
        city = json.load(fh)
    for f in city["features"]:
        geom = f["geometry"]
        polygons = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        polygons = [p for p in polygons if p and in_bbox(p[0])]
        polygons = [[r for r in (clip_ring(r) for r in p) if r] for p in polygons]
        polygons = [p for p in polygons if p]
        if not polygons:
            continue
        features.append({
            "type": "Feature",
            "properties": {"name": clean_park_name(f["properties"].get("nom_ev", ""))},
            "geometry": {"type": "MultiPolygon", "coordinates": polygons},
        })
    print(f"  parks: {len(features)} from the City of Paris")

    # Luxembourg and the Tuileries are state-owned, so the city's green-space
    # register does not list them; they come from OSM instead.
    osm_path = os.path.join(RAW, "parks_osm.json")
    if os.path.exists(osm_path):
        with open(osm_path, encoding="utf-8") as fh:
            osm = json.load(fh)
        added = 0
        for el in osm.get("elements", []):
            geom = el.get("geometry")
            if el.get("type") != "way" or not geom:
                continue
            ring = [[p["lon"], p["lat"]] for p in geom]
            if len(ring) < 4 or not in_bbox(ring):
                continue
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            features.append({
                "type": "Feature",
                "properties": {"name": el.get("tags", {}).get("name", "")},
                "geometry": {"type": "MultiPolygon", "coordinates": [[ring]]},
            })
            added += 1
        print(f"         + {added} state-owned gardens from OpenStreetMap")

    return {"type": "FeatureCollection", "features": features}


def write(name, payload):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    print(f"         wrote data/{name} ({os.path.getsize(path) / 1024:.0f} KB)")


def main():
    print("Building context layers")
    write("water.geojson", build_water())
    write("parks.geojson", build_parks())


if __name__ == "__main__":
    main()

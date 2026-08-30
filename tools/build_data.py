#!/usr/bin/env python3
"""Bake data/*.geojson into app/js/data.js.

The GeoJSON files under data/ stay the editable source of truth. This script
produces the single artifact the app loads. It is emitted as a <script src>
assignment rather than a .json file on purpose: fetch() is blocked by CORS on
file:// pages, so inlining is what lets the app run by double-clicking it.

Run after editing any source GeoJSON:

    python3 tools/build_data.py
"""

import json
import os
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "app", "js", "data.js")

# ~11 m at Paris' latitude. These layers are decorative context, not survey
# data, so they are simplified hard. Parks get a finer tolerance than water:
# there are only 32 of them, so the extra detail costs ~10 KB.
WATER_TOLERANCE = 0.0001
PARK_TOLERANCE = 0.00004
PRECISION = 5  # ~1 m

# Stations serving more than one line share this beige instead of taking a line
# colour, so it cannot be derived from the station's line list.
INTERCHANGE = "#D8D8B9"

# Sixteen of the line colours in the source are the official RATP values. The
# other six were invented when the dataset was built and sit in a visibly
# different colour space — muddier and darker, unrelated in saturation — so the
# historical lines read as mistakes rather than as history.
#
# These restate them deliberately, in the palette of the Nord-Sud company whose
# faience actually decorated those stations: ochre and terminus brown for its
# own lines A and B, desaturated shades of their successors for the lines that
# were absorbed, and a true neutral for the connecting tracks, which were never
# a passenger service.
HISTORICAL_COLOURS = {
    "Ligne A": "#B5762A",                       # Nord-Sud ochre, became line 12
    "Ligne B": "#6B4423",                       # Nord-Sud terminus brown -> 13
    "Ligne 2 Sud": "#8C6A7E",                   # muted line 5, which absorbed it
    "Ligne 14 (ancienne)": "#7E93A8",           # muted line 13, which absorbed it
    "Voie des Fêtes et voie navette": "#9A8C6D",  # a siding, not a service
    "Couloirs": "#9DA0A6",                      # interchange corridors
}


def simplify(points, tolerance):
    """Douglas-Peucker. Iterative, so deep rings can't blow the stack."""
    if len(points) < 3 or not tolerance:
        return points

    def perpendicular(p, a, b):
        x, y = p[0], p[1]
        ax, ay = a[0], a[1]
        bx, by = b[0], b[1]
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        return ((x - (ax + t * dx)) ** 2 + (y - (ay + t * dy)) ** 2) ** 0.5

    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        worst, at = 0.0, i
        for k in range(i + 1, j):
            d = perpendicular(points[k], points[i], points[j])
            if d > worst:
                worst, at = d, k
        if worst > tolerance:
            keep.add(at)
            stack.append((i, at))
            stack.append((at, j))
    return [points[k] for k in sorted(keep)]


def signed_area(ring):
    """Shoelace. Positive means counterclockwise in lon/lat space."""
    total = 0.0
    for i in range(len(ring) - 1):
        total += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return total / 2.0


def orient(rings):
    """Wind rings the way d3-geo wants them.

    d3-geo treats polygons as spherical, and infers the inside from winding
    order: an exterior ring smaller than a hemisphere must be CLOCKWISE. This
    is the opposite of RFC 7946, which the source data follows, so every ring
    arrives inverted and d3 fills the entire globe instead of the river.
    """
    out = []
    for i, ring in enumerate(rings):
        clockwise = signed_area(ring) < 0
        want_clockwise = (i == 0)  # ring 0 is the exterior, the rest are holes
        out.append(ring if clockwise == want_clockwise else ring[::-1])
    return out


def round_ring(points):
    return [[round(p[0], PRECISION), round(p[1], PRECISION)] for p in points]


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as fh:
        return json.load(fh)


def build_polygon_layer(filename, tolerance, label):
    """Simplify and rewind a polygon layer down to what the map needs."""
    src = load(filename)
    before = after = 0
    polygons = []
    for feature in src["features"]:
        geom = feature["geometry"]
        parts = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        for polygon in parts:
            rings = []
            for ring in polygon:
                before += len(ring)
                thinned = round_ring(simplify(ring, tolerance))
                # A ring needs 4 positions (3 distinct + the closing repeat).
                if len(thinned) >= 4:
                    rings.append(thinned)
                    after += len(thinned)
            if rings:
                polygons.append(orient(rings))
    print(f"  {label:9} {before:>6} -> {after:>5} points, {len(polygons)} polygons")
    return {"type": "MultiPolygon", "coordinates": polygons}


def build(lines_src, stations_src):
    colors = {}
    for feature in lines_src["features"]:
        props = feature["properties"]
        colors.setdefault(props["ligne"], props["couleur"])
    colors.update({k: v for k, v in HISTORICAL_COLOURS.items() if k in colors})

    # Every feature that is still open carries the date the dataset was built as
    # a sentinel end_date, which is normalised to end=None, i.e. "still open".
    # The non-numeric guard below is left in for a literal "NaT" the 2020 build
    # produced for Victor Hugo's pre-1931 site; the 2026 rebuild dates it
    # properly, so nothing in the current data reaches it.
    ends = [f["properties"]["end_date"] for f in lines_src["features"]]
    ends += [f["properties"]["end_date"] for f in stations_src["features"]]
    horizon = max(e for e in ends if e[:1].isdigit())

    def end_of(value):
        return None if value == horizon or not value[:1].isdigit() else value

    lines = []
    for feature in lines_src["features"]:
        props, geom = feature["properties"], feature["geometry"]
        if geom["type"] == "LineString":
            segments = [round_ring(geom["coordinates"])]
        else:
            segments = [round_ring(s) for s in geom["coordinates"]]
        lines.append({
            "line": props["ligne"],
            "start": props["start_date"],
            "end": end_of(props["end_date"]),
            "geometry": {"type": "MultiLineString", "coordinates": segments},
        })

    # "nom de référence" is a lineage key, not the modern name. It usually is the
    # modern name, but for stations later merged into a bigger complex it is the
    # older one: the Marbeuf lineage ends as Franklin D. Roosevelt, Montparnasse
    # and Avenue du Maine both end as Montparnasse - Bienvenüe. Reading it as
    # "current name" therefore inverts the label on those ten lineages.
    #
    # So derive the current name instead: whatever the lineage's still-open
    # record calls itself. Lineages with no open record are closed stations
    # (Arsenal, Croix-Rouge, Saint-Martin...) and get nothing, since there is no
    # "today" for them to have a name in.
    lineage = {}
    for feature in stations_src["features"]:
        props = feature["properties"]
        lineage.setdefault(props["nom de référence"], []).append(props)

    current_name = {}
    for key, group in lineage.items():
        still_open = [p for p in group if end_of(p["end_date"]) is None]
        if still_open:
            current_name[key] = max(still_open, key=lambda p: p["start_date"])["nom"]

    # The reverse view: what a station standing today used to be called. Keyed by
    # the present-day name rather than by lineage, so a station formed by a merger
    # lists everything it was assembled from — Franklin D. Roosevelt reports both
    # Marbeuf and Rond-point des Champs-Élysées, whichever of its records you hover.
    former_names = {}
    for key, group in lineage.items():
        today = current_name.get(key)
        if not today:
            continue
        earlier = former_names.setdefault(today, [])
        for props in sorted(group, key=lambda p: p["start_date"]):
            if props["nom"] != today and props["nom"] not in earlier:
                earlier.append(props["nom"])

    stations = []
    for feature in stations_src["features"]:
        props = feature["properties"]
        lon, lat = feature["geometry"]["coordinates"]
        colour = props["couleur"]
        # Single-line stations take their line's colour, so they inherit the
        # restatement above; interchanges keep the shared beige.
        if colour != INTERCHANGE and len(props["lignes"]) == 1:
            colour = colors.get(props["lignes"][0], colour)
        now = current_name.get(props["nom de référence"])
        renamed_since = bool(now) and now != props["nom"]
        stations.append({
            "name": props["nom"],
            # Two complementary views of a rename, never both at once:
            #   now  - on a historic record, what the station is called today
            #   was  - on a present-day record, what it used to be called
            "now": now if renamed_since else None,
            "was": (former_names.get(now) or None) if now and not renamed_since else None,
            "lines": props["lignes"],
            "color": colour,
            "interchange": colour == INTERCHANGE,
            "start": props["start_date"],
            "end": end_of(props["end_date"]),
            "lon": round(lon, PRECISION),
            "lat": round(lat, PRECISION),
        })

    starts = [f["start"] for f in lines] + [s["start"] for s in stations]
    return {
        "meta": {
            "first": min(starts),
            "last": horizon,
            "generated": date.today().isoformat(),
        },
        "colors": colors,
        "lines": lines,
        "stations": stations,
    }


def main():
    print("Building app/js/data.js")
    lines_src = load("lignes_historiques.geojson")
    stations_src = load("stations_historiques.geojson")

    payload = build(lines_src, stations_src)
    payload["water"] = build_polygon_layer("water.geojson", WATER_TOLERANCE, "water:")
    payload["parks"] = build_polygon_layer("parks.geojson", PARK_TOLERANCE, "parks:")

    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("// Generated by tools/build_data.py - do not edit by hand.\n")
        fh.write("// Source of truth: data/*.geojson\n")
        fh.write("window.METRO_DATA = ")
        fh.write(body)
        fh.write(";\n")

    print(f"  lines:    {len(payload['lines'])}")
    print(f"  stations: {len(payload['stations'])} "
          f"({sum(1 for s in payload['stations'] if s['interchange'])} interchange, "
          f"{sum(1 for s in payload['stations'] if s['now'])} pre-rename, "
          f"{sum(1 for s in payload['stations'] if s['was'])} with former names)")
    print(f"  colors:   {len(payload['colors'])}")
    print(f"  span:     {payload['meta']['first']} -> {payload['meta']['last']}")
    print(f"  wrote:    {os.path.relpath(OUT, ROOT)} "
          f"({os.path.getsize(OUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

# The dataset

Four hand-maintained CSVs under `raw_data/` are the editable source of truth.
Everything else in this directory is generated from them and should never be
edited by hand.

```
raw_data/stations_history.csv    name,end_date,start_date,latitude,longitude,lineage,note
raw_data/segments_history.csv    from_station,to_station,start_date,end_date,line
raw_data/stations_planned.csv    the same two schemas, for lines
raw_data/segments_planned.csv    that have not been built
        |
        |  data_set_creation/lines and stations to json.ipynb
        v
stations_history.geojson         one point per station record
lines_history.geojson            one geometry per line snapshot
        |
        |  tools/build_data.py   (+ water.geojson, parks.geojson)
        v
app/js/data.js                   what the app actually loads
```

Dates are `YYYY-MM-DD`. `note` is documentation for whoever reads the CSV next
and is not carried into the GeoJSON.

## Where it comes from

The station and line history was scraped from the French Wikipedia
[list of metro stations](https://fr.wikipedia.org/wiki/Liste_des_stations_du_métro_de_Paris)
in 2020, and extended in 2026 from the per-line articles and the MediaWiki
coordinates API to cover the openings from 2013 onward. The projected Grand
Paris Express sections come from the `Modèle:Grand Paris Express` tables. All of
it is **CC BY-SA**, and share-alike travels with it — see
[DATA-LICENSES.md](../DATA-LICENSES.md). The 2020 notebooks that first produced
the CSVs are retired under [`archive/`](../archive/README.md).

Water and parks are separate and unrelated to the metro chain; they are
described at the bottom of this file.

## The three words that get misread

**A station row is one *version* of a station, not the station.** A new row is
cut whenever anything changes — a line arriving, the platforms moving — so its
own dates describe the version, not the life. Pont de Sèvres, whose record is
cut in 2027 by line 15, would otherwise read "1934–2027" as though it were
closing. Each station therefore also carries `since` / `until`: the span of the
run of records that are the same station under the same name, which is what the
tooltip shows. Only a rename or a real closure ends a run, so Marbeuf still
reads 1900–1942 and Arsenal still reads 1906–1939.

**A segment row is one pair of *adjacent* stations** on a line, with the dates
that pair was connected; the lines on the map are drawn by joining them up. Both
directions of each pair are required — a station's line set is read from the
rows where it appears as `from_station`.

**`lineage` is a lineage key, not the current name.** It usually is the modern
name, but for stations later merged into a larger complex it is the older one:
the `Marbeuf` and `Rond-point des Champs-Élysées` lineages both end as Franklin
D. Roosevelt, and `Montparnasse` and `Avenue du Maine` both end as
Montparnasse - Bienvenüe. Reading it as "current name" inverts the label on those
ten lineages. `build_data.py` therefore derives the current name from whichever
record in a lineage is still open. Each station then carries the two
complementary views of a rename, never both at once: `now` on a historic record
(what it is called today) and `was` on a present-day record (what it used to be
called). `was` is keyed by the modern name rather than by lineage, so a station
formed by a merger lists everything it was assembled from — Montparnasse -
Bienvenüe reports Avenue du Maine, Bienvenüe and Montparnasse. Lineages with no
open record are closed stations (Arsenal, Croix-Rouge, Saint-Martin) and get
neither field. `from_station` and `to_station` match against `lineage`, not
`name`.

## Record and projection

The dataset holds two different kinds of thing: 126 years of **record**, and a
handful of lines that are **projection**. The `planned` flag that separates them
comes from **which file a row is in** — never from comparing a date to the
clock. A date test would promote line 15 to "built" the first time anyone
rebuilt after its announced opening date, asserting as fact something nobody had
checked. The day a line really opens, its rows move into the `*_history` pair by
hand; nothing else marks a projection as having come true.

Every feature also carries `start` and `end`, with `end: null` meaning "still
open". A feature is drawn for a given date when
`start <= date && (end === null || end > date)`.

**The open sentinel.** Open-ended dates are left blank in the CSVs. The notebook
closes them on a single sentinel — one day past the last opening in the data, or
the day it runs, whichever is later — and `build_data.py` derives that sentinel
back out rather than hard-coding a date, mapping it to `end: null`. It used to be
simply the run date, which worked while the data stopped at the present; with the
timeline reaching into 2028 that would close the built network mid-run and drop a
projected line from the output entirely. The practical consequence: **the
notebook and `build_data.py` must be run in the same pass.**

The record currently runs to **29 August 2026**, ending with Villejuif - Gustave
Roussy on line 14, 18 January 2025. The projection runs to **December 2028** and
holds the five Grand Paris Express sections already in testing: line 18 to Christ
de Saclay, line 15 South, the first sections of lines 16 and 17, and line 16's
completion to Noisy-Champs. The later sections — 15 West and East, 17 to Le
Mesnil-Amelot, 18 to Versailles — are deliberately left out: their dates have
moved repeatedly and none is in testing.

## How a line gets its shape

A line's geometry is not fixed. Its segments are melted into one geometry and
re-sampled at each of the line's key dates, producing a series of snapshots that
the app switches between as the timeline moves.

Station dates are part of those key dates, which matters: **four stations were
rebuilt on a new site** — Victor Hugo (311 m), Porte Maillot, Les Halles and
Porte de Versailles. A line's shape is sampled at the start of each of its
snapshots, so unless the move cuts a snapshot the line keeps the old position for
good: line 2 held Victor Hugo 311 m off its 1931 site for the rest of the
timeline, leaving the dot visibly detached from the track. Snapshots that come
out identical are merged again, so the extra cuts cost nothing. Stations that
stay put sit exactly on their line; the only ones that do not are the
multi-cluster interchanges below, by design.

## Oddities worth knowing

- Large interchanges carry several records, one per platform cluster — Châtelet
  has three, Franklin D. Roosevelt four. They are all drawn; the legend counts
  distinct station names, which is why its totals match the real network.
- Sixteen line colours are the official RATP values and are passed through
  untouched. The other six were invented when the dataset was built and sat in a
  visibly different colour space, so the historical lines read as mistakes.
  `HISTORICAL_COLOURS` in `build_data.py` restates them deliberately, in the
  palette of the Nord-Sud company that actually tiled those stations: ochre and
  terminus brown for its own lines A and B, desaturated shades of their
  successors for the lines that were absorbed, and a neutral for `Couloirs`,
  which was never a passenger service.
- `Ligne A` and `Ligne B` are the Nord-Sud company's lines, which became 12
  and 13 in 1930. `Ligne 2 Sud` was absorbed into line 5 in 1906.
  `Ligne 14 (ancienne)` is the pre-1976 line 14, absorbed into 13; today's
  line 14 opened in 1998. `Couloirs` are connecting tracks, not a passenger
  line, so they are drawn but kept out of the legend.
- Park names from the city dataset are stored in capitals without accents, so
  they come out as "Parc Andre Citroen". Nothing displays them today, but that
  is worth knowing before adding park labels.
- The dataset lists 10 stations for line 1 on its opening day, 19 July 1900.
- One station name has a typo in the source: `Porte de Vincenne`.

## The context layers

`tools/build_context.py` rebuilds `water.geojson` and `parks.geojson` from the
raw sources in `raw_data/`. It only needs re-running when those change, which is
rare.

**Water** is the Apur `PLAN_EAU` dataset, filtered to the 87 named bodies near
the network — the Seine and Marne, the Canal Saint-Martin, the Canal de l'Ourcq,
the Bassin de la Villette, the lakes in both Bois. Geometry is **clipped** to the
bounding box rather than kept or dropped whole, because the Seine's downstream
arm is a single polygon running from Mantes all the way up to Paris: any cutoff
tight enough to exclude Mantes also amputated the river just west of the city.
Clipping keeps what is on screen and discards the rest, with the cut edge well
outside the frame.

**Parks** are the 30 City of Paris green spaces above 4 hectares, excluding
cemeteries, plus the Jardin du Luxembourg and the Jardin des Tuileries — both
state-owned, so absent from the city's register, and taken from OpenStreetMap
instead.

`build_data.py` builds a line-name → colour lookup, rounds coordinates to 5
decimals, normalises the dates, and simplifies both outlines. It also **rewinds
their polygon rings**:
`d3-geo` treats polygons as spherical and requires clockwise exterior rings, the
opposite of what RFC 7946 and the source data use. Without that step d3 fills the
entire globe instead of the river.

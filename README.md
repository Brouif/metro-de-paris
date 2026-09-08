# Chronologie du métro de Paris

How did the Paris metro come to be? If you live here it is furniture — the thing
you take without looking, the noise under the pavement. But it is also 126 years
of continuous construction, begun on 19 July 1900 with ten stations between
Porte Maillot and Porte de Vincennes, fought over by rival companies until the
Nord-Sud was absorbed in 1930, and still not finished: sections of four Grand
Paris Express lines are in testing as this is written. Stations have been
renamed, merged into each other, closed, and in four cases rebuilt on a
different site. This is a map of all of it, year by year.

<!-- TODO: live URL goes here -->

![The map at 1928, zoomed on the inner network: ten numbered lines plus the Nord-Sud
company's A and B, two years before they became 12 and 13](docs/screenshot.png)

## What it does

Drag the timeline or press play, and the network builds itself year by year.
Hovering a line, a station or a legend entry highlights it across all three. The
river, canals and main parks are drawn underneath for orientation. Sixteen lines
run today; twenty line identities appear across the record, the other four
absorbed into their successors.

One play button, plus a toggle beside it that reverses the direction of time.
The play arrow points the way time will move and flips when you reverse, so the
control always shows what it will do. Reversing mid-run keeps running the other
way. Playback stops at whichever end it is heading for, and pressing play again
from there wraps to the far end.

Available in French and English — the switch is in the top right. The interface
follows your browser's language on first visit, and remembers your choice after
that; `?lang=en` or `?lang=fr` forces one. Station and line names stay in French
either way, since they are proper nouns.

Everything ships as static files — no build step, no server, no CDN.

## Methodology

### Where the data comes from

The station and line history was scraped from the French Wikipedia
[list of metro stations](https://fr.wikipedia.org/wiki/Liste_des_stations_du_métro_de_Paris)
in 2020, and extended in 2026 from the per-line articles and the MediaWiki
coordinates API to cover the openings from 2013 onward. The projected Grand
Paris Express sections come from the `Modèle:Grand Paris Express` tables. All of
it is **CC BY-SA**, and share-alike travels with it — see
[DATA-LICENSES.md](DATA-LICENSES.md).

The water and parks underneath are separate, and unrelated to the metro
pipeline: Apur's *PLAN EAU* (ODbL) and the City of Paris green-space register
(ODbL) plus two state-owned gardens from OpenStreetMap.

### The chain

Four hand-maintained CSVs are the editable source of truth. Everything below
them is generated, and should never be edited by hand.

```
data/raw_data/stations_history.csv    one row per version of a station
data/raw_data/segments_history.csv    one row per adjacent pair on a line
data/raw_data/stations_planned.csv    the same two schemas, for lines
data/raw_data/segments_planned.csv    that have not been built
        |
        |  data_set_creation/lines and stations to json.ipynb
        v
data/stations_history.geojson         641 points
data/lines_history.geojson            168 line snapshots
        |
        |  tools/build_data.py   (+ data/water.geojson, data/parks.geojson)
        v
app/js/data.js                        what the app actually loads
```

The five earlier notebooks are the 2020 provenance record — a scrape, a
spreadsheet join, two date-parsing passes and one dead end — and are not
maintained code. They live under `archive/`, with the intermediates they read
and wrote, because keeping them beside the live notebook implied they still ran.
Two steps in that chain were done by hand and cannot be re-run. See
[archive/README.md](archive/README.md) for the full account.

### The vocabulary

Three words carry most of the weight, and reading any of them the obvious way
gets the data wrong:

- **A station row is one *version* of a station**, not the station. A new row is
  cut whenever anything changes — a line arriving, the platforms moving — so its
  dates describe that version, not the station's life.
- **A segment row is one pair of *adjacent* stations** on a line, with the dates
  that pair was connected. The lines on the map are drawn by joining them up.
  Both directions of each pair are required: a station's line set is read from
  the rows where it appears as `from_station`.
- **`lineage` is a lineage key, not the current name.** It usually is the modern
  name, but for stations later folded into a larger complex it is the older one —
  `Marbeuf` and `Rond-point des Champs-Élysées` both end as Franklin D.
  Roosevelt. `from_station` and `to_station` match against `lineage`, not
  `name`.

### How a line gets its shape

A line's geometry is not fixed. Its segments are melted into one geometry and
re-sampled at each of the line's key dates, producing a series of snapshots that
the app switches between as the timeline moves. Station dates are part of those
key dates, which matters: four stations were rebuilt on a new site, and without
a cut at the move the line would keep the old position for good — line 2 held
Victor Hugo 311 m off its 1931 site, visibly detached from the track. Snapshots
that come out identical are merged again, so the extra cuts cost nothing.

### Record and projection

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

### The open sentinel

Open-ended dates are left blank in the CSVs. The notebook closes them on a
single sentinel — one day past the last opening in the data, or the day it runs,
whichever is later — and `build_data.py` derives that sentinel back out rather
than hard-coding a date, mapping it to `end: null`. It used to be simply the run
date, which worked while the data stopped at the present; with the timeline
reaching into 2028 that would close the built network mid-run and drop a
projected line from the output entirely.

The practical consequence: **the notebook and `build_data.py` must be run in the
same pass**, because the second derives a value the first computed.

## The file system

```
app/                      the app (this is what you deploy)
  index.html
  css/app.css
  js/d3.v7.min.js         vendored, not loaded from a CDN
  js/data.js              generated — never hand-edit
  js/i18n.js              all UI strings, French and English
  js/app.js
  fonts/                  Archivo, self-hosted variable font
  favicon.svg
  .nojekyll               so GitHub Pages serves the directory as-is
data/
  raw_data/
    stations_history.csv    \
    segments_history.csv     |  the editable source of truth
    stations_planned.csv     |
    segments_planned.csv    /
    PLAN_EAU.kml           raw water source (Apur)
    parks_paris.geojson    raw park source (Ville de Paris)
    parks_osm.json         Luxembourg and the Tuileries (OpenStreetMap)
  stations_history.geojson  generated by the notebook
  lines_history.geojson     generated by the notebook
  water.geojson             generated by tools/build_context.py
  parks.geojson             generated by tools/build_context.py
tools/
  build_data.py           data/*.geojson  ->  app/js/data.js
  build_context.py        raw water + park sources -> data/{water,parks}.geojson
  serve.py                no-cache dev server for app/
data_set_creation/
  lines and stations to json.ipynb   the live step
  README.md               how to run it, and what it does
archive/                  the 2020 chain, retired. Mirrors the tree above, so
  data_set_creation/      a file's place says what it used to be. French names
  data/                   and one propagated typo kept on purpose.
  README.md               the provenance record, and why none of it re-runs
docs/                     images for this file
```

## Running it

Double-click `app/index.html`. That is the whole procedure.

It works from `file://` because the data is loaded as a plain `<script src>`
rather than fetched — `fetch()` is blocked by CORS on `file://` pages, a
`<script>` tag is not. That is the reason `data.js` exists instead of a `.json`.

To serve it over HTTP instead:

```bash
python3 tools/serve.py 8000
```

That serves `app/` with caching disabled. `python3 -m http.server` works too,
but it sends `Last-Modified`, so browsers hold on to `app.css` and `index.html`
and will quietly show you a stale build after an edit.

To deploy, copy `app/` anywhere static — it needs no configuration: drag it into
Netlify, point Vercel at it, or push it to GitHub Pages, where the `.nojekyll`
file is already in place.

## Adding a station

Edit the CSVs, then regenerate. Never touch `data/*.geojson` or `app/js/data.js`
by hand.

1. **Add one row per version** to `data/raw_data/stations_history.csv`:

   ```
   name,end_date,start_date,latitude,longitude,lineage,note
   ```

   Dates are `YYYY-MM-DD`; leave `end_date` empty for anything still open.
   `lineage` is the lineage key — usually the modern name, but the older one for
   a station later merged into a larger complex. `note` is documentation for
   whoever reads the CSV next and is not carried into the GeoJSON.

2. **Add its links** to `data/raw_data/segments_history.csv`:

   ```
   from_station,to_station,start_date,end_date,line
   ```

   One row per adjacent pair, **in both directions**, matched on `lineage`.

3. **For a line that has not opened yet**, use `stations_planned.csv` and
   `segments_planned.csv` instead — same two schemas, read by the same notebook,
   flagged `planned` on the way through. Moving the rows into the `*_history`
   pair is what promotes a projection to record, and it is a manual step by
   design.

4. **Re-run** `data_set_creation/lines and stations to json.ipynb` **from the
   repository root** — it uses repo-root-relative paths, unlike the archived
   notebooks. It needs pandas, numpy, geopandas and shapely; see
   [data_set_creation/README.md](data_set_creation/README.md) for the venv.

5. **Then run `python3 tools/build_data.py`**, in the same pass — see
   [The open sentinel](#the-open-sentinel).

   ```bash
   python3 tools/build_data.py
   ```

   It builds a line-name → colour lookup, rounds coordinates to 5 decimals,
   normalises the dates, and simplifies and rewinds the water and park outlines.
   (`d3-geo` treats polygons as spherical and requires **clockwise** exterior
   rings, the opposite of RFC 7946 and the source data. Without that step d3
   fills the entire globe instead of the river.)

Nothing in the app or the scripts needs touching to move either end of the
timeline. The record currently runs to **29 August 2026**, ending with
Villejuif - Gustave Roussy on line 14, 18 January 2025. The projection runs to
**December 2028** and holds the five Grand Paris Express sections already in
testing: line 18 to Christ de Saclay, line 15 South, the first sections of lines
16 and 17, and line 16's completion to Noisy-Champs. The later sections — 15
West and East, 17 to Le Mesnil-Amelot, 18 to Versailles — are deliberately left
out: their dates have moved repeatedly and none is in testing.

### UI strings

Add the key to both languages in `app/js/i18n.js` and mark the element in
`index.html` with `data-i18n`, `data-i18n-html` or `data-i18n-aria-label`. No
code change is needed.

### Context layers

`tools/build_context.py` rebuilds `data/water.geojson` and `data/parks.geojson`
from the raw sources. It only needs re-running when those change, which is rare.

Water is the Apur `PLAN_EAU` dataset, filtered to the 87 named bodies near the
network — the Seine and Marne, the Canal Saint-Martin, the Canal de l'Ourcq, the
Bassin de la Villette, the lakes in both Bois. Geometry is **clipped** to the
bounding box rather than kept or dropped whole, because the Seine's downstream
arm is a single polygon running from Mantes all the way up to Paris: any cutoff
tight enough to exclude Mantes also amputated the river just west of the city.
Clipping keeps what is on screen and discards the rest, with the cut edge well
outside the frame.

Parks are the 30 City of Paris green spaces above 4 hectares, excluding
cemeteries, plus the Jardin du Luxembourg and the Jardin des Tuileries — both
state-owned, so absent from the city's register, and taken from OpenStreetMap
instead.

## Design system

**Archivo** (SIL OFL), self-hosted in `app/fonts/` as a single 88 KB variable
file. One file covers both widths: the interface runs at normal width and the
year readout at `font-stretch: 76%`, close to the condensing Parisine gets from
its own compression. Self-hosted rather than linked, because the app is meant to
run from `file://` where a CDN stylesheet would not load.

**The accent is the cobalt of the enamel station plate**, the one colour
continuous across the network's whole life. It replaces a red that belonged to
no era but Motte's.

**Line casings are the reason the map is legible.** The RATP line colours were
drawn for white paper and enamel: measured against the map's land tone, twelve
of the twenty-two fell below the 3:1 WCAG floor for graphical objects, line 1's
yellow reaching only 1.19:1. Rather than alter canonical colours, every line is
drawn twice — a casing path 1px wider beneath it, in a shade of the line's own
hue — which takes all 22 above 3:1 in **both** themes. The shade has to follow
the theme: darkening rescues the pale colours on the light map but does nothing
for line 2's navy on the dark one, so the casing always moves away from whatever
ground it sits on.

**Projections are drawn in a different language.** Presenting a planned line the
way the 1900 opening of line 1 is presented would be a claim the data cannot
support, so planned track is dashed and planned stations are hollow rings, at
every year — a projection never resolves into a solid line, however far the
scrubber travels. Dashes rather than a fade, because opacity is already spoken
for by the hover dim, and because a dash carries no colour information and so
holds for colour-blind readers. The timeline says it twice more: the stretch
past today is dashed with a rule marking the boundary, and past it the year
readout itself is labelled *projet* / *planned*.

**The map stays framed on the built network alone.** Grand Paris Express reaches
Saclay and Chelles; fitting the frame to include them would shrink the historic
core to about 60% at every year, spending the map's whole budget on track nobody
has ridden. The planned lines run off the edges instead, and the zoom floor was
lowered to 0.5 so you can pull back to see where they go. *Reset view* returns
to the built frame.

## Notes on the data

- Large interchanges carry several records, one per platform cluster — Châtelet
  has three, Franklin D. Roosevelt four. They are all drawn; the legend counts
  distinct station names, which is why its totals match the real network.
- `lineage` in the source is a **lineage key, not the current name**.
  It usually is the modern name, but for stations later merged into a larger
  complex it is the older one: the `Marbeuf` and `Rond-point des Champs-Élysées`
  lineages both end as Franklin D. Roosevelt, and `Montparnasse` and
  `Avenue du Maine` both end as Montparnasse - Bienvenüe. Reading it as "current
  name" inverts the label on those ten lineages. `build_data.py` therefore
  derives the current name from whichever record in a lineage is still open.
  Each station then carries the two complementary views of a rename, never both
  at once: `now` on a historic record (what it is called today) and `was` on a
  present-day record (what it used to be called). `was` is keyed by the modern
  name rather than by lineage, so a station formed by a merger lists everything
  it was assembled from — Montparnasse - Bienvenüe reports Avenue du Maine,
  Bienvenüe and Montparnasse. Lineages with no open record are closed stations
  (Arsenal, Croix-Rouge, Saint-Martin) and get neither field.
- **A record is a version of a station, not the station.** One is cut whenever
  anything changes — a line arriving, the platforms moving — so its own dates
  describe the version, not the life. Pont de Sèvres, whose record is cut in
  2027 by line 15, would otherwise read "1934–2027" as though it were closing.
  Each station therefore also carries `since` / `until`: the span of the run of
  records that are the same station under the same name, which is what the
  tooltip shows. Only a rename or a real closure ends a run, so Marbeuf still
  reads 1900–1942 and Arsenal still reads 1906–1939.
- **Four stations were rebuilt on a new site** — Victor Hugo (311 m), Porte
  Maillot, Les Halles and Porte de Versailles. A line's shape is sampled at the
  start of each of its snapshots, so unless the move cuts a snapshot the line
  keeps the old position for good: line 2 held Victor Hugo 311 m off its 1931
  site for the rest of the timeline, leaving the dot visibly detached from the
  track. Station dates are part of each line's key dates for that reason, and
  snapshots that come out identical are merged again so the extra cuts cost
  nothing. Stations that stay put still sit exactly on their line; the only
  ones that do not are the multi-cluster interchanges above, by design.
- Park names from the city dataset are stored in capitals without accents, so
  they come out as "Parc Andre Citroen". Nothing displays them today, but that
  is worth knowing before adding park labels.
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
- The dataset lists 10 stations for line 1 on its opening day, 19 July 1900.
- One station name has a typo in the source: `Porte de Vincenne`.

## Credits

Map and slider approach adapted from Mike Bostock and John Walley.

- **Station and line history** — scraped from
  [fr.wikipedia.org](https://fr.wikipedia.org/wiki/Liste_des_stations_du_métro_de_Paris)
  (see [`archive/`](archive/README.md)). **CC BY-SA**,
  share-alike applies.
- **Water** — [Apur](https://opendata.apur.org/datasets/5e20951f1b7148d48503dceb480f7f6f_0),
  *PLAN EAU* — **ODbL 1.0**. *(Earlier versions of this file credited Ville de
  Paris. That was wrong — the dataset is Apur's and covers all of
  Île-de-France.)*
- **Parks** — Ville de Paris `espaces_verts` (**ODbL**) plus
  © OpenStreetMap contributors (**ODbL**) for Luxembourg and the Tuileries.
- **Software** — D3 (ISC), Archivo (SIL OFL 1.1).

Full detail:

| | |
|---|---|
| [LICENSE](LICENSE) | MIT — this project's own code |
| [THIRD-PARTY.md](THIRD-PARTY.md) | every vendored library and the font |
| [DATA-LICENSES.md](DATA-LICENSES.md) | per-file data provenance and terms |

The MIT licence covers code only. The bundled data carries its own share-alike
obligations, which it cannot override. Attribution is also shown in the app
itself, behind the © button on the map — ODbL requires the notice to travel with
the map, not just sit in this file.

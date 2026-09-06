# Chronologie du métro de Paris

An interactive map of the Paris metro's growth from 1900 to 2026, and of the
lines due to open by 2028. Drag the timeline or press play, and the network
builds itself year by year. Hovering a
line, a station or a legend entry highlights it across all three. The river,
canals and main parks are drawn underneath for orientation.

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

```
app/                  the app (this is what you deploy)
  index.html
  css/app.css
  js/d3.v7.min.js     vendored, not loaded from a CDN
  js/data.js          generated — see below
  js/i18n.js          all UI strings, French and English
  fonts/              Archivo, self-hosted variable font
  js/app.js
data/                 source GeoJSON, the editable source of truth
tools/build_data.py     data/*.geojson  ->  app/js/data.js
tools/build_context.py  raw water + park sources -> data/{water,parks}.geojson
tools/serve.py          no-cache dev server for app/
data_set_creation/      how the historical data was built — see its README
archive/                hand-edited intermediates from that pipeline
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

## Deploying

`app/` is a plain static directory, so any static host works with no
configuration: drag it into Netlify, point Vercel at it, or push it to GitHub
Pages. A `.nojekyll` file is already in place so Pages serves the directory
as-is.

## Updating the data

`data/*.geojson` is the source of truth; `app/js/data.js` is generated from it
and should never be hand-edited. After changing the GeoJSON:

```bash
python3 tools/build_data.py
```

The script builds a line-name → colour lookup, rounds coordinates to 5 decimals,
normalises the dates, and simplifies the water and park outlines. It also
rewinds their polygon rings: `d3-geo` treats polygons as spherical and requires
**clockwise** exterior rings, the opposite of what RFC 7946 and the source data
use. Without that step d3 fills the entire globe instead of the river.

To add a UI string, add the key to both languages in `app/js/i18n.js` and mark
the element in `index.html` with `data-i18n`, `data-i18n-html` or
`data-i18n-aria-label`. No code change is needed.

## Refreshing the context layers

`tools/build_context.py` rebuilds `data/water.geojson` and `data/parks.geojson`
from the raw sources in `data/raw_data/`. It only needs re-running when those
sources change, which is rare.

- **Water** comes from the Paris `PLAN_EAU` dataset already in the repo. The
  original visualisation filtered it to `L_EAU == "Seine"`; the app now keeps
  every body near the network, which adds the Marne, the Canal Saint-Martin,
  the Canal de l'Ourcq, the Bassin de la Villette and the lakes in both Bois —
  87 named bodies in all.

  Geometry is **clipped** to the bounding box rather than kept or dropped whole.
  That matters because the Seine's downstream arm is a single polygon running
  from Mantes at 1.51 E all the way up to 2.16 E: any cutoff tight enough to
  exclude Mantes also amputated the river just west of Paris, leaving a visible
  gap. Clipping keeps the part that is on screen and discards the rest, so the
  box can be generous without carrying geometry nobody will see. The cut edge
  runs along the box, well outside the frame.
- **Parks** are the 30 City of Paris green spaces above 4 hectares, excluding
  cemeteries, plus the Jardin du Luxembourg and the Jardin des Tuileries. Those
  two are state-owned and so absent from the city's register; they come from
  OpenStreetMap instead.

Each feature carries `start` and `end`; `end: null` means "still open". A
feature is drawn for a given date when `start <= date && (end === null || end > date)`.

It also carries `planned`, which separates **record** from **projection**:
track that has not been built. Planned features are drawn dashed, with hollow
stations, and stay that way at every year — they never resolve into solid
lines, because they never happened. See [Projections](#projections).

### Extending the timeline

The two history GeoJSONs are **generated**, not hand-edited. Add the new
stations to `data/raw_data/evolution_station.csv` and the new inter-station
links to `data/raw_data/evolution_correspondances.csv` — both directions for
each link, since a station's line set is read from the rows where it appears as
`De` — then re-run `data_set_creation/lines and stations to json.ipynb`
followed by `tools/build_data.py`. See
[data_set_creation/README.md](data_set_creation/README.md) for how to run it.

Lines that have not opened go in `data/raw_data/futur_station.csv` and
`data/raw_data/futur_correspondances.csv` instead — same two schemas, read by
the same notebook, flagged `projet` on the way through. **The day a line opens,
move its rows into the `evolution_*` pair**: that promotion is the whole point
of the split, and nothing else marks a projection as having come true.

Leave `end_date` / `Fermeture` empty for anything still open. The notebook
closes those rows on a single sentinel — one day past the last opening in the
data, or the day it runs, whichever is later — and `build_data.py` derives that
sentinel back out rather than hard-coding a date. Nothing in the app or the
scripts needs touching to move either end of the timeline.

The record runs to **29 August 2026**, ending with Villejuif - Gustave Roussy
on line 14, 18 January 2025. The projection runs to **December 2028** and holds
the five Grand Paris Express sections already in testing: line 18 to Christ de
Saclay, line 15 South, the first sections of lines 16 and 17, and line 16's
completion to Noisy-Champs. The later sections — 15 West and East, 17 to
Le Mesnil-Amelot, 18 to Versailles — are deliberately left out: their dates have
moved repeatedly and none is in testing.

## Design system

Typography is **Archivo** (SIL OFL), self-hosted in `app/fonts/` as a single
88 KB variable file. One file covers both widths: the interface runs at normal
width and the year readout at `font-stretch: 76%`, which is close to the
condensing Parisine gets from its own 90% compression. Self-hosted rather than
linked, because the app is meant to run from `file://` where a CDN stylesheet
would not load. Latin subset only — nothing in the data or the interface goes
above U+00FF.

The accent is the cobalt of the enamel station plate, the one colour continuous
across the network's whole life. It replaces a red that belonged to no era but
Motte's.

**Line casings** are the reason the map is legible. The RATP line colours were
drawn for white paper and enamel: measured against the map's land tone, twelve
of the twenty-two fell below the 3:1 WCAG floor for graphical objects, line 1's
yellow reaching only 1.19:1. Rather than alter canonical colours, every line is
drawn twice — a casing path 1px wider beneath it, in a shade of the line's own
hue. That keeps the identity while restoring the edge, and takes all 22 lines
above 3:1 in **both** themes. Line and casing come to 3px together, against
2.6px for the bare line before casing existed, so the edge costs almost nothing
in apparent weight.

The shade has to follow the theme: darkening rescues the pale colours on the
light map but does nothing for line 2's navy on the dark one, so the casing moves
away from whichever ground it sits on. `syncCasings()` checks the theme on each
render rather than relying only on the `matchMedia` change event, since that
event is the only thing standing between a theme switch and 740 wrongly-shaded
strokes.

### Projections

The dataset now holds two different kinds of thing, and the design's job is to
keep them apart: 126 years of **record**, and a handful of lines that are
**projection**. Presenting a planned line in the same visual language as the
1900 opening of line 1 would be a claim the data cannot support.

So planned track is **dashed** and planned stations are **hollow rings**, at
every year — a projection never resolves into a solid line, however far the
scrubber travels. Dashes rather than a fade, because opacity is already spoken
for by the hover dim: a dimmed built line and a highlighted planned one would
come out the same grey. The distinction survives both themes and carries no
colour information, so it holds for colour-blind readers too. The casing takes
the same dash pattern, or it would read as a solid line under a dotted one.

The timeline says it twice more. The stretch of track past today is drawn in
the same dashed language, with a rule marking the boundary, and past it the
year readout itself is labelled *projet* / *planned* — the one signal that
cannot be missed at a glance. Tooltips drop "depuis 1900" for "en projet ·
ouverture prévue en 2027".

**The map is still framed on the built network alone.** Grand Paris Express
reaches Saclay and Chelles; fitting the frame to include them would shrink the
historic core to about 60% at every year, spending the map's whole budget on
track nobody has ridden. The planned lines run off the edges instead, and the
zoom floor was lowered from 1 to 0.5 — it used to be impossible to pull back
from the initial fit — so you can zoom out to see where they go. *Reset view*
returns to the built frame.

## Notes on the data

- Large interchanges carry several records, one per platform cluster — Châtelet
  has three, Franklin D. Roosevelt four. They are all drawn; the legend counts
  distinct station names, which is why its totals match the real network.
- `nom de référence` in the source is a **lineage key, not the current name**.
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
  (see [`data_set_creation/`](data_set_creation/README.md)). **CC BY-SA**,
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

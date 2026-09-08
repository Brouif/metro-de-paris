# The Paris Métro through time

You take it every day without looking at it. But the station you stand on has
not always been called that. Marbeuf became Franklin D. Roosevelt. Avenue du
Maine was swallowed by Montparnasse - Bienvenüe. Some stations have moved:
Victor Hugo sits three hundred metres from where it opened. And three of them
closed on 3 September 1939, the day France declared war, and never opened again:
Arsenal, Croix-Rouge, Saint-Martin.

None of that was built by one hand. Ten stations opened between Porte Maillot
and Porte de Vincennes on 19 July 1900, in time for the Exposition Universelle.
For the next thirty years two rival companies dug against each other under the
same streets. The Nord-Sud tiled its stations in its own colours until the CMP
swallowed it in 1930, and its lines A and B became 12 and 13. Lines were
absorbed, renumbered, pushed out into the suburbs. It has not stopped: four
Grand Paris Express lines are in testing now, due out to 2028. A hundred and
twenty-six years, and still a building site.

A metro map is normally a snapshot: the network on the day it was printed, with
nothing in it about how it got that way. This one is not stuck on a single day.
Every station and every stretch of track has an opening date, and a closing date
if it ever closed. Pick any day between 1900 and today and you see exactly what
was running. Push past today and you see what is planned instead. Drag the
timeline and the network assembles itself.

<!-- TODO: live URL goes here -->

![The map at 1928, zoomed on the inner network: ten numbered lines plus the
Nord-Sud company's A and B, two years before they became 12 and 13](docs/screenshot.png)

## What it does

Drag the timeline or press play, and the network builds itself year by year.
Hovering a line, a station or a legend entry highlights it across all three. The
river, canals and main parks are drawn underneath for orientation.

One play button, plus a toggle beside it that reverses the direction of time.
The play arrow points the way time will move and flips when you reverse, so the
control always shows what it will do. Reversing mid-run keeps running the other
way; playback stops at whichever end it is heading for, and pressing play again
from there wraps to the far end.

Lines that have not been built yet are drawn dashed, with hollow stations, at
every year. A projection never resolves into a solid line.

Available in French and English; the switch is in the top right. The interface
follows your browser's language on first visit and remembers your choice after
that; `?lang=en` or `?lang=fr` forces one. Station and line names stay in French
either way, since they are proper nouns.

## Running it

Double-click `app/index.html`. That is the whole procedure. No build step, no
server, no CDN.

It works from `file://` because the data is loaded as a plain `<script src>`
rather than fetched: `fetch()` is blocked by CORS on `file://` pages, a
`<script>` tag is not. That is why `data.js` exists instead of a `.json`.

To serve it over HTTP instead:

```bash
python tools/serve.py 8000
```

That serves `app/` with caching disabled. `python -m http.server` works too, but
it sends `Last-Modified`, so browsers hold on to `app.css` and `index.html` and
will quietly show you a stale build after an edit.

To deploy, copy `app/` anywhere static. No configuration is needed, and a
`.nojekyll` file is already in place for GitHub Pages.

To correct or extend the data, see
[docs/adding-a-station.md](docs/adding-a-station.md). `data/*.geojson` and
`app/js/data.js` are generated. Never hand-edit either.

## Where things live

```
app/                 the app. This is what you deploy.
data/                the dataset, and the CSVs it is built from
tools/               build_data.py, build_context.py, serve.py
data_set_creation/   the one notebook that still runs
archive/             the retired 2020 chain, mirroring the tree above
docs/                design notes and images
```

| | |
|---|---|
| [docs/adding-a-station.md](docs/adding-a-station.md) | how to add or correct station and line data |
| [data/README.md](data/README.md) | the dataset: schemas, vocabulary, oddities |
| [data_set_creation/README.md](data_set_creation/README.md) | how to regenerate the GeoJSONs |
| [docs/design.md](docs/design.md) | typography, line casings, how projections are drawn |
| [archive/README.md](archive/README.md) | where the data came from, and why none of it re-runs |

## Credits

Map and slider approach adapted from Mike Bostock and John Walley.

- **Station and line history.** Scraped from
  [fr.wikipedia.org](https://fr.wikipedia.org/wiki/Liste_des_stations_du_métro_de_Paris)
  (see [`archive/`](archive/README.md)). **CC BY-SA**, share-alike applies.
- **Water.** [Apur](https://opendata.apur.org/datasets/5e20951f1b7148d48503dceb480f7f6f_0),
  *PLAN EAU*. **ODbL 1.0**.
- **Parks.** Ville de Paris `espaces_verts` (**ODbL**) plus
  © OpenStreetMap contributors (**ODbL**) for Luxembourg and the Tuileries.
- **Software.** D3 (ISC), Archivo (SIL OFL 1.1).

| | |
|---|---|
| [LICENSE](LICENSE) | MIT. This project's own code |
| [THIRD-PARTY.md](THIRD-PARTY.md) | every vendored library and the font |
| [DATA-LICENSES.md](DATA-LICENSES.md) | per-file data provenance and terms |

The MIT licence covers code only. The bundled data carries its own share-alike
obligations, which it cannot override. Attribution is also shown in the app
itself, behind the © button on the map. ODbL requires the notice to travel with
the map, not just sit in this file.

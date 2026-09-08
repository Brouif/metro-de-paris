# The live step: `lines and stations to json.ipynb`

One notebook lives here, and it is the only part of the data pipeline that still
runs. It turns the four hand-maintained CSVs into the two GeoJSONs everything
downstream is derived from:

```
data/raw_data/stations_history.csv
+ data/raw_data/segments_history.csv
+ data/raw_data/stations_planned.csv     (lines that have not opened)
+ data/raw_data/segments_planned.csv
    -> data/lines_history.geojson
    -> data/stations_history.geojson
```

From there, `tools/build_data.py` bakes those two files — plus
`data/water.geojson` and `data/parks.geojson`, which come from
`tools/build_context.py` and have nothing to do with this notebook — into
`app/js/data.js`.

A **station** row is one version of a station — its name, position and dates. A
**segment** row is one pair of *adjacent* stations on a line, with the dates that
pair was connected; the lines on the map are drawn by joining them up.

The five notebooks that produced those CSVs in 2020 are retired and live under
[`archive/`](../archive/README.md), which is also where the provenance of the
data — and its **CC BY-SA** obligation, inherited from Wikipedia — is recorded.
See [DATA-LICENSES.md](../DATA-LICENSES.md).

## Running it

Everything it needs is in the four CSVs, so it re-runs on its own. From the
repository root:

```
python -m venv .venv
.venv/bin/pip install pandas numpy geopandas shapely
```

It uses repo-root-relative paths (`data/raw_data/…`, `data/*.geojson`), so **run
it from the repository root**, then `python tools/build_data.py` after it. Open
dates are left blank in the CSVs and closed by a sentinel this notebook
computes, so **`data.js` must be rebuilt from the same pass** — see
[The projection](#the-projection).

`tools/build_data.py` and `tools/build_context.py` need none of the scientific
stack; they are pure standard library. Only this notebook needs it. The 2026 run
used pandas 3.0.5, geopandas 1.1.4 and shapely 2.1.2.

## The projection

What `planned` means, and why it comes from which file a row sits in rather than
from a date test, is in [data/README.md](../data/README.md#record-and-projection).
This notebook is where the flag is applied: it reads both pairs, tags the rows,
and writes the flag onto every feature it produces.

Two implementation consequences worth knowing:

- **The line snapshots are grouped by `(line, planned)`, not by `line`.** The
  union that assembles a snapshot melts its segments into one geometry, so a
  line that is part built and part projected has to be split before that, not
  after. Nothing in the data needs it yet — the five projected sections are all
  whole new lines — but a projected extension of an existing line would.
- **The open sentinel is no longer the run date.** It used to be, which worked
  while the data stopped at the present. With the timeline reaching into 2028,
  that date would close the built network mid-run and close a projected line
  before it opened, dropping it from the output entirely. The sentinel now sits
  one day past the last opening in the data, or on the run date, whichever is
  later — so it moves when the projection does, and `data.js` has to be rebuilt
  from the same pass.

## The 2026 baseline check

The notebook was re-run on 29 August 2026 to extend the timeline from 2013 to
2026. That run was checked against the committed 2020 output first, with the
sentinel pinned back to `2020-05-04`: all 153 line features and 587 station
features came back identical, which is what makes the regenerated files
trustworthy. Two things did change, both deliberate:

- `lines` on a merged interchange was built with `list(set(...))`, whose order is
  not stable between runs. It is now `sorted(set(...))`, matching what the cell
  above it already did, so a re-run produces the same bytes twice.
- Victor Hugo's pre-1931 site used to come out with `end_date: "NaT"`, which the
  app read as "still open" and drew forever. It is now closed on 1 January 1931,
  the date already sitting in `stations_history.csv`.

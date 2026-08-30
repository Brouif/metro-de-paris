# How the station and line data was built

These notebooks are the provenance record for
`data/lignes_historiques.geojson` and `data/stations_historiques.geojson`, the two
files everything else in the project is derived from. They are kept so the origin
of the data — and its **CC BY-SA** obligation, inherited from Wikipedia — stays
auditable. See [DATA-LICENSES.md](../DATA-LICENSES.md).

The first five were run once, in 2020: a historical record, not maintained code.
Read the caveats below before assuming any of it re-runs. **The last one,
`lines and stations to json.ipynb`, is live** — it was re-run on 29 August 2026 to
extend the timeline from 2013 to 2026, and is how the two GeoJSONs should be
regenerated whenever the CSVs change.

## The chain

```
Wikipedia scrapping.ipynb
    fr.wikipedia.org (Liste des stations du métro de Paris)
    -> archive/station_extract.csv

Match stations from lignes with location.ipynb
    archive/station_extract.csv + archive/Lignes du metro.xlsx
    -> archive/station_info_raw.csv

    [MANUAL] name-change corrections
    -> archive/station_info_avec_changement_de_nom.csv

Stations - Correct dates.ipynb
    archive/station_info_avec_changement_de_nom.csv
    -> archive/station_info_avec_changement_de_nom_date_formatted.csv

    [MANUAL] renamed
    -> data/raw_data/evolution_station.csv

Correspondances - Format date.ipynb
    data/raw_data/correspondances_date_non_formatees.xlsx
    -> data/raw_data/evolution_correspondances.csv

lines and stations to json.ipynb                      <- the final step
    data/raw_data/evolution_station.csv
  + data/raw_data/evolution_correspondances.csv
  + data/raw_data/futur_station.csv            (lines that have not opened)
  + data/raw_data/futur_correspondances.csv
    -> data/lignes_historiques.geojson
    -> data/stations_historiques.geojson
```

From there, `tools/build_data.py` bakes those two files — plus `data/water.geojson`
and `data/parks.geojson`, which come from `tools/build_context.py` and have nothing
to do with these notebooks — into `app/js/data.js`.

## Caveats

**Two steps are manual and cannot be reproduced by re-running anything.** The
name-change corrections that turn `station_info_raw.csv` into
`station_info_avec_changement_de_nom.csv` were made by hand, and the formatted
output was then renamed by hand to `evolution_station.csv`. Both intermediate files
are kept in `archive/` precisely because the steps that produced them are not
repeatable.

**The notebooks disagree about the working directory.** `lines and stations to
json.ipynb` uses repo-root-relative paths (`data/raw_data/…`, `data/*.geojson`) and
must be run from the repository root. The other five use bare filenames from when
everything sat in one folder, so each expects to be run from the directory holding
its inputs — `archive/` for the station chain, `data/raw_data/` for
`Correspondances - Format date.ipynb`. The paths are left as they were rather than
rewritten, so what each notebook actually did stays legible.

**`Convert edited extract to json .ipynb` is a dead end.** It reads
`archive/station_extract_with_edits.csv` and ends on a bare `to_json()` whose result
is never written anywhere. Nothing downstream depends on it. It is kept only as a
record of an approach that was tried.

**`Lignes du metro.xlsx` and `correspondances_date_non_formatees.xlsx` were compiled
by hand** from the line-by-line opening dates; they have no upstream script.

## Re-running the final notebook

Everything it needs is in the four CSVs, so it re-runs on its own. From the
repository root:

```
python3 -m venv .venv
.venv/bin/pip install pandas numpy geopandas shapely
```

then run the notebook from the repository root and `python3 tools/build_data.py`
after it. Open dates are left blank in the CSVs and closed by a sentinel the
notebook computes, so **`data.js` must be rebuilt from the same pass** — see
[The projection](#the-projection) for what that sentinel is now.

## The projection

The `futur_*` pair carries lines that have not been built. The notebook reads
both pairs, tags the rows `projet`, and writes that flag onto every feature it
produces; `tools/build_data.py` passes it to the app as `planned`, which is what
draws them dashed.

The flag comes from **which file a row is in**, never from comparing its date to
the clock. A date test would promote line 15 to "built" the first time anyone
rebuilt after its opening date, asserting as fact something nobody had checked.
The day a line really opens, move its rows into the `evolution_*` pair by hand.

Two consequences worth knowing:

- **The line snapshots are grouped by `(ligne, projet)`, not by `ligne`.** The
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

The 2026 run was checked against the committed 2020 output first, with the
sentinel pinned back to `2020-05-04`: all 153 line features and 587 station
features came back identical, which is what makes the regenerated files
trustworthy. Two things did change, both deliberate:

- `lignes` on a merged interchange was built with `list(set(...))`, whose order is
  not stable between runs. It is now `sorted(set(...))`, matching what the cell
  above it already did, so a re-run produces the same bytes twice.
- Victor Hugo's pre-1931 site used to come out with `end_date: "NaT"`, which the
  app read as "still open" and drew forever. It is now closed on 1 January 1931,
  the date already sitting in `evolution_station.csv`.

## Dependencies

`pandas`, `numpy`, `geopandas`, `shapely` (the 2026 run used pandas 3.0.5,
geopandas 1.1.4 and shapely 2.1.2), `openpyxl`, and — for the scraper —
`requests`, `beautifulsoup4`, `mwparserfromhell`. Several notebooks call
`locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')` to parse French month names, which
needs that locale present on the system.

Note that `tools/build_data.py` and `tools/build_context.py` need **none** of this —
they are pure standard library. Only these notebooks need the scientific stack.

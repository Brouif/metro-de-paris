# How the station and line data was built

These notebooks are the provenance record for
`data/lignes_historiques.geojson` and `data/stations_historiques.geojson`, the two
files everything else in the project is derived from. They were run once, in 2020,
and are kept so the origin of the data — and its **CC BY-SA** obligation, inherited
from Wikipedia — stays auditable. See [DATA-LICENSES.md](../DATA-LICENSES.md).

They are a historical record, not maintained code. Read the caveats below before
assuming any of it re-runs.

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

## Dependencies

`pandas`, `numpy`, `geopandas`, `shapely`, `openpyxl`, and — for the scraper —
`requests`, `beautifulsoup4`, `mwparserfromhell`. Several notebooks call
`locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')` to parse French month names, which
needs that locale present on the system.

Note that `tools/build_data.py` and `tools/build_context.py` need **none** of this —
they are pure standard library. Only these notebooks need the scientific stack.

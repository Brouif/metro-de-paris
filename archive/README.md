# The 2020 chain, retired

These five notebooks and the files they read and wrote are the provenance record
for `data/raw_data/stations_history.csv` and
`data/raw_data/segments_history.csv`, the hand-maintained CSVs the live pipeline
starts from. They are kept so the origin of the data, and its **CC BY-SA**
obligation inherited from Wikipedia, stays auditable. See
[DATA-LICENSES.md](../DATA-LICENSES.md).

They were run once, in 2020. Nothing here is maintained code, and two steps in
the chain cannot be reproduced at all. Read the caveats before assuming any of
it re-runs. The one notebook that is still live is [`data_set_creation/lines and
stations to json.ipynb`](../data_set_creation/README.md), which takes over where
this chain ends.

This directory mirrors the live tree: `archive/data_set_creation/` for the
notebooks, `archive/data/` for what they read and wrote. A file's place here
says what it used to be.

## The chain

```
archive/data_set_creation/
  Wikipedia scrapping.ipynb                          scrape the station list
    fr.wikipedia.org (Liste des stations du métro de Paris)
    -> archive/data/station_extract.csv

  Match stations from lines with location.ipynb      attach coordinates
    archive/data/station_extract.csv
  + archive/data/Lignes du metro.xlsx                ("metro lines")
    -> archive/data/station_info_raw.csv

    [MANUAL] name-change corrections, made by hand
    -> archive/data/station_info_avec_changement_de_nom.csv  ("with name changes")

  Stations - Correct dates.ipynb                     parse French date strings
    archive/data/station_info_avec_changement_de_nom.csv
    -> archive/data/station_info_avec_changement_de_nom_date_formatted.csv

    [MANUAL] renamed by hand
    -> data/raw_data/stations_history.csv

  Segments - Format dates.ipynb                      parse French date strings
    archive/data/correspondances_date_non_formatees.xlsx  ("unformatted dates")
    -> data/raw_data/segments_history.csv

                                                     <- the live pipeline
                                                        takes over here
```

The files used to be called `correspondances`, which reads as *interchange* in
French metro usage and named the wrong thing in either language.

## Why these files are still in French

The files under `archive/data/` keep their original names and column headers on
purpose. They are a capture of the French Wikipedia station infoboxes, whose
fields really are `mise en service`, `nom inaugural` and `station précédente 1`;
renaming them would misreport what was scraped. The glosses above are there so
the chain still reads in English. The live pipeline, everything under `data/`,
uses English names throughout.

One artefact worth knowing about: `Fermetrue` in this chain is a misspelling of
`Fermeture` (closure). It propagated through three files and two notebooks and
is left as it is, for the same reason.

## Caveats

**Two steps are manual and cannot be reproduced by re-running anything.** The
name-change corrections that turn `station_info_raw.csv` into
`station_info_avec_changement_de_nom.csv` were made by hand, and the formatted
output was then renamed by hand to `stations_history.csv`. Both intermediate
files are kept here precisely because the steps that produced them are not
repeatable.

**All five expect to be run from `archive/data/`.** They use bare filenames from
when everything sat in one folder, so each expects the directory holding its
inputs, which is now `archive/data/` for every one of them. The paths are left
as they were rather than rewritten, so what each notebook actually did stays
legible. (The live notebook is the exception: it uses repo-root-relative paths
and runs from the repository root.)

**`Convert edited extract to json .ipynb` is a dead end.** It reads
`archive/data/station_extract_with_edits.csv` and ends on a bare `to_json()`
whose result is never written anywhere. Nothing downstream depends on it. It is
kept only as a record of an approach that was tried.

**`Lignes du metro.xlsx` and `correspondances_date_non_formatees.xlsx` were
compiled by hand** from the line-by-line opening dates; they have no upstream
script.

## Dependencies

`pandas`, `numpy` and `openpyxl` throughout; `requests`, `beautifulsoup4` and
`mwparserfromhell` for the scraper. Several of these notebooks call
`locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')` to parse French month names,
which needs that locale present on the system.

# Data provenance and licences

The bundled data comes from four sources under three different sets of terms.
None of them is affected by the project's MIT licence, which covers code only.

**Read this before republishing the data.** Every source carries a share-alike
obligation, under one of two incompatible regimes — CC BY-SA for the history,
ODbL for all of the geography.

## Per file

### `data/stations_historiques.geojson`, `data/lignes_historiques.geojson`

Station and line history — names, opening and closing dates, geometry.

- **Source:** [fr.wikipedia.org](https://fr.wikipedia.org/wiki/Liste_des_stations_du_métro_de_Paris),
  scraped by `data_set_creation/Wikipedia scrapping.ipynb`
- **Licence:** **CC BY-SA** (Wikipedia's text licence)
- **Obligations:** attribution, and **share-alike** — a derivative of this data
  must be released under the same terms

This is the project's oldest data and, until now, the least documented. The
share-alike obligation is real and applies to anything derived from it.

### `data/water.geojson`

The Seine, the Marne, the canals, and the lakes in both Bois. Built from
`data/raw_data/PLAN_EAU.kml` by `tools/build_context.py`.

- **Source:** **Apur** (Atelier Parisien d'Urbanisme), dataset *PLAN EAU* —
  the hydrographic network of Île-de-France.
  <https://opendata.apur.org/datasets/5e20951f1b7148d48503dceb480f7f6f_0>
- **Licence:** **ODbL 1.0**, confirmed from Apur's own dataset metadata
  (`license: ODbL-1.0`)
- **Obligations:** attribution, and share-alike on derived databases

*(An earlier version of the README credited this layer to Ville de Paris. That
was wrong: the file spans départements 75–95, and its `C_DEP` + `L_EAU` schema
is Apur's, as is the treatment of bridges and islands subtracted from the
polygons so that they appear only as holes.)*

### `data/parks.geojson`

The 32 largest parks, built by `tools/build_context.py` from two sources:

- 30 parks — **Ville de Paris**, dataset `espaces_verts`, via
  <https://opendata.paris.fr>. Licence: **ODbL** (confirmed via their API).
- Jardin du Luxembourg and Jardin des Tuileries — **© OpenStreetMap
  contributors**, via the Overpass API. Licence: **ODbL**.

Both carry attribution and share-alike obligations on derived databases. The
two state-owned gardens come from OSM because, being state property rather than
city property, they are absent from the city's green-space register.

## `app/js/data.js`

A build artifact produced by `tools/build_data.py`, combining **all** of the
above into a single file for the app to load.

It is therefore **not offered under any single licence**. It carries every
notice above simultaneously, and the CC BY-SA and ODbL share-alike regimes do
not compose cleanly with each other.

If you need to reuse this data, take it from the separate files in `data/`,
where the sources remain distinct and each carries its own terms, rather than
from the combined bundle.

## Line colours

The sixteen numbered line colours are the official RATP/IDFM values, reproduced
as factual identifiers of the lines. The six historical lines use colours chosen
for this project (see `HISTORICAL_COLOURS` in `tools/build_data.py`) and are not
official. RATP and the line marks are trademarks of their owner; this project is
unaffiliated.

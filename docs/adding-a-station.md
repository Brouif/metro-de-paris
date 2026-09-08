# Adding a station

Edit the CSVs, then regenerate. Never hand-edit `data/*.geojson` or
`app/js/data.js`. Both are generated, and both will be overwritten.

If any of the terms below are unfamiliar (*version*, *lineage*, *projection*),
read [data/README.md](../data/README.md) first. Getting `lineage` wrong
mislabels ten stations.

## 1. Add the station

One row **per version of the station** in `data/raw_data/stations_history.csv`:

```
name,end_date,start_date,latitude,longitude,lineage,note
```

- Dates are `YYYY-MM-DD`. Leave `end_date` empty if the station is still open.
- A new version is cut whenever anything changes: a line arriving, the platforms
  moving. One station can therefore be several rows.
- `lineage` is the lineage key, usually the modern name, but the older one for a
  station later merged into a larger complex.
- `note` is documentation for whoever reads the CSV next. It is not carried into
  the GeoJSON, so use it freely to record a source or a doubt.

## 2. Add its links

One row **per adjacent pair, in both directions**, in
`data/raw_data/segments_history.csv`:

```
from_station,to_station,start_date,end_date,line
```

Both directions are required: a station's line set is read from the rows where
it appears as `from_station`, so a station listed only as `to_station` will draw
with no lines. `from_station` and `to_station` match on `lineage`, not `name`.

## 3. If the line has not opened yet

Use `stations_planned.csv` and `segments_planned.csv` instead. They take the
same two schemas, are read by the same notebook, and are flagged `planned` on
the way through.

The day the line really opens, **move its rows into the `*_history` pair by
hand**. That move is what promotes a projection to record, and it is manual by
design: nothing compares a date to the clock, because a date test would promote
a line to "built" the first time anyone rebuilt after its announced opening
date, asserting as fact something nobody had checked.

## 4. Regenerate

Run `data_set_creation/lines and stations to json.ipynb` **from the repository
root**, because it uses repo-root-relative paths. It needs pandas, numpy,
geopandas and shapely; see
[data_set_creation/README.md](../data_set_creation/README.md) for the venv.

Then, **in the same pass**:

```bash
python tools/build_data.py
```

The two steps are not independent. The notebook closes open-ended dates on a
sentinel it computes at run time, and `build_data.py` derives that sentinel back
out to decide which records are still open. Running one without the other leaves
the app reading a boundary that no longer matches the data.

## 5. Check it

Open `app/index.html` and scrub to the year you changed. Things worth a look:

- the station appears on the right date, and disappears again if you gave it an
  `end_date`;
- it sits **on** its line rather than beside it. A station off the track usually
  means a missing segment row, or one in only one direction;
- the legend count for that line went up by one.

## Adding a UI string

Add the key to **both** languages in `app/js/i18n.js`, then mark the element in
`app/index.html` with `data-i18n`, `data-i18n-html` or `data-i18n-aria-label`.
No code change is needed.

Station and line names are not translated. They are proper nouns, and stay in
French in both interfaces.

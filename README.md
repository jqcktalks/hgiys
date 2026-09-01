# How Good Is Your Station?

Every railway station in Great Britain, scored on how punctual, frequent and
well connected it actually is, using the ORR's published performance figures.

## Running it

Needs Node 20 or newer.

```
npm install
npm run ingest
npm run dev
```

`npm run ingest` downloads the ORR source files and writes `data/`. That folder
is generated and isn't in the repo, so ingest has to run once before `dev` or
`build`, otherwise the build fails looking for `data/index.json`. It takes about
20 seconds and caches the downloads in `.cache/`, so later runs skip the fetch.

## How the score works

Four measures, each turned into a percentile across every scored station:

| Measure       | Weight | Built from                                  |
| ------------- | ------ | ------------------------------------------- |
| Reliability   | 35%    | share of stops arriving within 3 minutes    |
| Cancellations | 25%    | share of scheduled stops cancelled          |
| Frequency     | 20%    | scheduled stops per day                     |
| Connectivity  | 20%    | operators calling, and interchange volume   |

Those four are blended by weight, and the blend is then converted to a
percentile of its own. That second step matters: averaging percentiles pulls
everything toward the middle, so the raw blend only spans about 12 to 93. After
it, a score of 80 means the station rates better than 80% of British stations,
not that 80% of its trains are on time.

Scores cover the most recent 13 railway periods, roughly a year. Stations where
the ORR measures only a small share of stops are pulled toward the national
average; ones with too little data aren't scored at all (currently 151 of
2,586).

There's a fuller write-up on the `/method` page.

## Data

- **ORR Table 3130**: punctuality and cancellations by station and operator
- **ORR Table 1410**: station codes, regions, footfall and interchanges

Both are published under the Open Government Licence v3.0.

The two tables join on station *name*, not code, since 3130 doesn't carry CRS.
Table 3130 is streamed rather than parsed whole, as its `content.xml` is around
279 MB uncompressed.

## Layout

```
app/       pages and components
lib/       data loading, scoring helpers, period formatting
scripts/   ingest and the streaming ODS reader
data/      generated, per-station JSON plus the index
```

Station pages are prerendered at build time, so there's no database and nothing
runs on the request path.

## Licence

Code is MIT, see [LICENSE](LICENSE). The ORR data it's built from is Open
Government Licence v3.0, which requires attribution.

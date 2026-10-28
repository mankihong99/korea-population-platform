# KOSIS long-term province population

Retrieved **2026-10-28**, from the public KOSIS population dashboard's
[total estimated population detail view](https://kosis.kr/visual/populationKorea/PopulationDashBoardDetail.do?listId=A_02&statJipyoId=3737&vStatJipyoId=5232).
The `00.html` response is national; other files use the public dashboard's
province codes. The HTML files are unmodified source responses, not executable
application assets. The importer reads the chart's numeric arrays with strict
parsing and never evaluates source JavaScript.

## Definition and scope

- Indicator: **총인구 (추계 기준)**, persons; published estimates/projections,
  not resident-registration counts or raw census observations.
- Displayed period: **1970–2025**, one published value for each available year.
  The source contains later projections; those are intentionally excluded.
- The 2022-base province projection is described by the
  [official 2024-05-28 briefing](https://www.korea.kr/briefing/policyBriefingView.do?newsId=156632807).
  The UI labels 2023–2025 as its **projection segment**, not observed counts.
  Charts distinguish past estimates (solid) from the projection (dashed,
  linked from the 2022 base point).
- The detailed mode retains MOIS 2014–2025 December-end resident counts and its
  2014 baseline. No values are spliced between the two sources.
- The historical series includes published retrospective estimates for cities
  before their separation as metropolitan administrative units. These are not
  fabricated by this application. No constant-boundary claim is made.
- Sejong has values only from **2012**. Its 1970 baseline is missing, so it is
  hatched on the comparison map in every year. Its available population/chart
  can still be viewed. Missing years remain `null`, never zero or interpolated.
- Current-looking map geometry remains KOSTAT **2018**, with an explicit notice
  that it is not a reconstruction of historical administrative boundaries.
- KOSIS dashboard Sejong code `27` is explicitly mapped to geometry code `29`.
  All other province codes correspond directly to the existing geometry.

## Reproduce

From the workspace root:

```text
powershell -File scripts/download-long-term.ps1
node scripts/import-long-term.cjs
node --test tests/long-term.test.mjs tests/population.test.mjs
node tests/render-population.mjs
npm.cmd run build
```

The public downloads need network access, not an API key. The result is a
bundled snapshot, not an automatic live connection. Refreshes require reviewing
the source vintage, updating the retrieval date, and rerunning validation.

The importer validates total = male + female for every source row (including
future rows before clipping), exact national/province sums for every displayed
year, and the indicator name/array lengths. `coverage.json` documents coverage.
Source URLs and SHA-256 hashes are stored in `src/data/long-term-population.json`.
The 1970 national total is 32,240,827, with 16 populated province series; from
2012 all 17 are populated. Published totals reconcile exactly in all 56 years.

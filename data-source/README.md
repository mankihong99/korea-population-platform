# Official resident population snapshot

Source: Ministry of the Interior and Safety (행정안전부),
[주민등록 인구통계 / 행정동별 연령별 인구현황](https://jumin.mois.go.kr/ageStatMonth.do).
Retrieved on **2026-10-28 (Asia/Seoul)** using the site's public CSV download.
No authentication key is used or included.

## Source definition

- Query: annual (`year`), all municipalities (`xlsStats=2`), registration type
  전체 (empty `sltUndefType`), total sex (`sum`), all ages.
- Value: each year's December-end `YYYY년_계_총인구수`, in persons.
- Resident registration population excludes foreign residents. The source
  includes residents of unknown residence from October 2010, and registered
  overseas Koreans from January 2015. The 2014–2015 comparison therefore also
  includes this coverage change; this is not a harmonized demographic series.
- Raw CSVs use EUC-KR/CP949 encoding and contain age-band columns as supplied.
- `population-2008-2013.csv`, `population-2014-2019.csv`, and
  `population-2020-2025.csv` are unchanged download responses.
- Only completed annual periods are shown. 2026 is excluded, not extrapolated.

## Reproduction and validation

From the project root, optionally refresh the raw snapshots with
`powershell -File scripts/download-population.ps1` (subject to local execution
policy and network access), then run:

```text
node scripts/import-population.cjs
node --test tests/population.test.mjs
node tests/render-population.mjs
npm.cmd run build
```

The importer detects total-population columns, checks ambiguous matches, and
stores SHA-256 hashes, exact source names, and ten-digit MOIS source codes for
each district/year in `src/data/resident-population.json`. `coverage.json`
records the number of matched map districts for every downloaded year.
Snapshot refreshes must update the retrieval date after verifying the source.
This is a bundled snapshot, not a live or automatically refreshed API.

## Common period and mapping

The map contains 250 nonoverlapping units (including general districts within
some cities), using 2018 KOSTAT geometry and five-digit statistical codes.
The importer matches **province + full city/district name**, preserving each
year's different MOIS code. It never assumes the two code systems are equal.

The first continuous period covering all 250 units is **2014–2025**. Earlier
years lack units such as Sejong and the reorganized Cheongju districts. The
common baseline is derived from coverage, not a hard-coded fallback. Values
outside the common period are not exposed by the application.

Explicit crosswalks cover Incheon Nam-gu → Michuhol-gu, Gunwi's Gyeongbuk →
Daegu transfer, province renamings for Gangwon and Jeonbuk, and Sejong's
province row as its single municipal unit. Yeoju's historical county name is
also handled during coverage analysis. Bucheon uses the city total, avoiding
double counting its general districts. Other cities represented by general
districts use only those districts, excluding their parent city's total.

Every year has 250 unique mapped source codes; their sum must equal the sum
of all 17 official province totals. A mismatch or missing common period aborts
the import. This validates coverage and totals, not unchanged geography.

**Boundary limitation:** population values refer to each year's administrative
areas; map geometry and province filters remain at 2018. Transfers, splits,
mergers and small boundary adjustments have not been spatially harmonized.
For example, Gunwi retains its 2018 map/filter position while the detail panel
uses the year's official province name. Changwon district adjustments can
affect population changes independently of births, deaths, or migration.
Do not interpret this as a constant-boundary demographic growth series.

Policy cards remain explicitly labelled examples, separate from official
population statistics.

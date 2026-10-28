# Province and district boundaries

`province-paths.json` and `district-paths.json` are derived from KOSTAT's 2018 boundaries,
distributed by [southkorea-maps](https://github.com/southkorea/southkorea-maps).

Source: https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-provinces-2018-geo.json

District source: https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-geo.json

The district source contains 250 features, including non-autonomous city
districts (for example, the four districts within Suwon). This is not a count
of current autonomous local governments. The first two digits of each district
code identify its parent province using the source's statistical codes.

The source repository describes KOSTAT data as “Free to share or remix.”
The boundary year is shown on the map: these are historical boundaries, not
a representation of all subsequent administrative changes.

Coordinates are projected to the SVG viewBox, rounded to 0.1 SVG units, and
consecutive duplicate points are removed. All 17 regions and source islands
are retained. To regenerate after downloading the source GeoJSON:

```sh
node scripts/prepare-map.cjs path/to/skorea-provinces-2018-geo.json
node scripts/prepare-map.cjs path/to/skorea-municipalities-2018-geo.json src/data/district-paths.json
```

Regions use a white-to-green/red scale based on each district's official
December-end resident population change relative to the common baseline (2014).
Color intensity uses a fixed linear scale,
saturating at ±100%; the legend documents this limit. Zero change and missing
data are white; tooltips distinguish them. Each district uses its own population
series. Colors are calculated in `src/data/population-color.js`; label anchors
are in `src/KoreaMap.jsx`. Selecting a district updates the panel and chart to
that district. The year slider affects population only, not the fixed 2018
boundaries. Population values are not harmonized to the 2018 boundaries;
administrative changes also affect comparisons. See
`data-source/README.md` for source files, coverage, crosswalks, and validation.

The map supports province filtering, district selection, fit-to-district via
the select menu, zoom controls, and a reset to the national extent. Projected
bounding boxes are bundled for fitting the viewport without a GIS dependency.

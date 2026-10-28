// Source: KOSTAT 2018, southkorea/southkorea-maps (free to share or remix).
// Run with the source GeoJSON path to regenerate the bundled SVG geometry.
const fs = require('node:fs');
const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const project = ([lon, lat]) => [(lon - 124.5) * 78 + 12, (38.7 - lat) * 100 + 12];
const paths = source.features.map(({ properties, geometry }) => {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const d = polygons.flatMap(polygon => polygon.map(ring => {
    const points = ring.map(project).map(p => p.map(n => +n.toFixed(1)));
    points.forEach(([x, y]) => {
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
    });
    const filtered = points.filter((p, i) => !i || p.some((v, j) => v !== points[i - 1][j]));
    return 'M' + filtered.map(p => p.join(',')).join('L') + 'Z';
  })).join('');
  return { code: properties.code, name: properties.name, d, bounds };
});
fs.writeFileSync(process.argv[3] || 'src/data/province-paths.json', JSON.stringify(paths));

const fs = require('node:fs');
const crypto = require('node:crypto');
const paths = require('../src/data/province-paths.json');
const sourceUrl = 'https://kosis.kr/visual/populationKorea/PopulationDashBoardDetail.do?listId=A_02&statJipyoId=3737&vStatJipyoId=5232';
const years = Array.from({ length: 56 }, (_, i) => 1970 + i);
const sources = [];
function readSeries(areaCode) {
  const file = `data-source/long-term/${areaCode}.html`;
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  const labels = JSON.parse(text.match(/var prdDe\s*=\s*(\[[^\]]+\])/s)?.[1] || 'null');
  const block = text.match(/var datas\s*=\s*\[([\s\S]*?)\];/)?.[1];
  if (!labels || !block) throw new Error('Missing chart series: ' + file);
  const series = [...block.matchAll(/name:\s*'([^']+)'[\s\S]*?data:\s*\[([^\]]*)\]/g)];
  if (series[0]?.[1] !== '총인구 (추계 기준)' || series.length !== 3) throw new Error('Unexpected indicator: ' + file);
  const values = series.map(s => s[2].replace(/,\s*$/, '').split(',').map(raw => {
    const value = raw.trim();
    if (!/^\d+$/.test(value)) throw new Error('Unexpected population token: ' + value);
    return Number(value);
  }));
  if (values.some(v => v.length !== labels.length)) throw new Error('Length mismatch: ' + file);
  const output = {};
  labels.forEach((label, i) => {
    if (values[0][i] !== values[1][i] + values[2][i]) throw new Error('Sex totals mismatch: ' + file + ':' + label);
    if (years.includes(Number(label))) output[label] = values[0][i];
  });
  sources.push({ file, areaCode, url: sourceUrl + '&areaId=' + (areaCode === '00' ? '' : areaCode), sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  return output;
}
const nationalTotals = readSeries('00');
const regions = paths.map(path => ({ code: path.code, name: path.name,
  values: readSeries(path.code === '29' ? '27' : path.code) }));
const coverage = years.map(year => {
  const available = regions.filter(r => r.values[year] != null);
  const sum = available.reduce((n, r) => n + r.values[year], 0);
  if (sum !== nationalTotals[year]) throw new Error(`National sum mismatch ${year}: ${sum} != ${nationalTotals[year]}`);
  return { year, available: available.length, nationalTotal: sum };
});
const output = { source: 'KOSIS 인구로 보는 대한민국 · 총인구 (추계 기준)', sourceUrl,
  methodologyUrl: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156632807',
  retrievedAt: '2026-10-28', populationType: '추계인구', unit: '명', baselineYear: 1970,
  projectionBaseYear: 2022, years, nationalTotals, regions, sources };
fs.writeFileSync('src/data/long-term-population.json', JSON.stringify(output));
fs.writeFileSync('data-source/long-term/coverage.json', JSON.stringify(coverage, null, 2));
console.log('Validated 17 provinces, 1970–2025, sex totals and national totals.');
console.log('Missing baseline:', regions.filter(r => r.values[1970] == null).map(r => r.name));

const fs = require('node:fs');
const crypto = require('node:crypto');
const districts = require('../src/data/district-paths.json');
const provinces = require('../src/data/province-paths.json');

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (quoted) throw new Error('Unclosed CSV field');
  return rows;
}
const normalize = text => text.replace(/\s/g, '').replace('강원특별자치도', '강원도').replace('전북특별자치도', '전라북도');
const records = new Map();
const sources = [];
for (const file of fs.readdirSync('data-source').filter(f => /^population-\d{4}-\d{4}\.csv$/.test(f)).sort()) {
  const bytes = fs.readFileSync('data-source/' + file);
  const rows = parseCsv(new TextDecoder('euc-kr').decode(bytes));
  const columns = rows[0].flatMap((header, index) => {
    const match = /^(\d{4})년_계_총인구수$/.exec(header);
    return match ? [{ index, year: Number(match[1]) }] : [];
  });
  if (!columns.length) throw new Error('Missing population columns: ' + file);
  sources.push({ file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), years: columns.map(c => c.year) });
  for (const row of rows.slice(1)) {
    const match = /^(.*?)\s*\((\d{10})\)$/.exec(row[0]);
    if (!match) continue;
    const name = normalize(match[1]);
    for (const { index, year } of columns) {
      const raw = row[index]?.replaceAll(',', '').trim();
      if (!raw || !/^\d+$/.test(raw)) continue;
      const value = Number(raw);
      // The export uses zero for units that did not yet exist or were abolished.
      if (value <= 0) continue;
      const key = name + ':' + year;
      const previous = records.get(key);
      if (previous && previous.population !== value) throw new Error('Conflicting source rows: ' + key);
      records.set(key, { population: value, code: match[2], sourceName: match[1].trim() });
    }
  }
}
const years = [...new Set(sources.flatMap(s => s.years))].sort((a, b) => a - b);
const aliases = {
  '23030': ['인천광역시미추홀구'],
  '31280': ['경기도여주군'],
  '37310': ['대구광역시군위군'],
};
const mapped = districts.map(district => {
  const province = provinces.find(p => p.code === district.code.slice(0, 2));
  const name = normalize(province.name + district.name);
  const names = [name, ...(aliases[district.code] || [])];
  // Sejong's province row is also the single municipal unit in this map.
  if (district.code.startsWith('29')) names.push('세종특별자치시');
  const values = {}; const sourceCodes = {}; const sourceNames = {};
  for (const year of years) {
    const matches = names.map(n => records.get(n + ':' + year)).filter(Boolean);
    const unique = [...new Map(matches.map(m => [m.code, m])).values()];
    if (unique.length > 1) throw new Error('Ambiguous mapping: ' + district.code + ':' + year);
    if (unique[0]) { values[year] = unique[0].population; sourceCodes[year] = unique[0].code; sourceNames[year] = unique[0].sourceName; }
  }
  return { code: district.code, name: district.code === '23030' ? '미추홀구' : district.name,
    provinceName: province.name, values, sourceCodes, sourceNames };
});
const coverage = years.map(year => ({ year, count: mapped.filter(d => d.values[year] != null).length,
  missing: mapped.filter(d => d.values[year] == null).map(d => d.provinceName + ' ' + d.name) }));
console.log(JSON.stringify(coverage, null, 2));
const first = years.find(year => years.filter(y => y >= year).every(y => mapped.every(d => d.values[y] != null)));
if (!first) throw new Error('No contiguous common period for all map districts; review coverage.');
const commonYears = years.filter(y => y >= first);
const nationalTotals = {};
for (const year of commonYears) {
  if (new Set(mapped.map(d => d.sourceCodes[year])).size !== mapped.length) throw new Error('Duplicate district source codes: ' + year);
  const provinceRows = provinces.map(p => records.get(normalize(p.name) + ':' + year));
  if (provinceRows.some(p => !p)) throw new Error('Missing province total: ' + year);
  const officialTotal = provinceRows.reduce((sum, p) => sum + p.population, 0);
  const mapTotal = mapped.reduce((sum, d) => sum + d.values[year], 0);
  if (mapTotal !== officialTotal) throw new Error(`National total mismatch ${year}: map=${mapTotal}, source=${officialTotal}`);
  nationalTotals[year] = officialTotal;
}
const output = { source: '행정안전부 주민등록 인구통계', sourceUrl: 'https://jumin.mois.go.kr/ageStatMonth.do',
  retrievedAt: '2026-10-28', referenceDate: '매년 12월 31일', unit: '명', populationType: '주민등록인구 전체 (외국인 제외)',
  baselineYear: first, years: commonYears, boundaryYear: 2018, nationalTotals, sources, districts: mapped };
fs.writeFileSync('src/data/resident-population.json', JSON.stringify(output));
fs.writeFileSync('data-source/coverage.json', JSON.stringify(coverage, null, 2));
console.log('Common period:', first, '-', commonYears.at(-1));

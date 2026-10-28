import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { longTermData as data, longTermByCode as byCode, longTermPopulation as pop,
  longTermChange as change, longTermChangeLabel as label, longTermPeriodLabel as period } from '../src/data/long-term.js';
import { populationChange } from '../src/data/population-color.js';
import { regionsByCode as districtByCode, baselineYear } from '../src/data/data.js';

test('long-term data covers 1970–2025 with exact national totals for every year', () => {
  assert.equal(data.years.length, 56);
  assert.equal(data.baselineYear, 1970);
  assert.equal(data.years.at(-1), 2025);
  assert.equal(data.regions.length, 17);
  assert.equal(new Set(data.regions.map(r => r.code)).size, 17);
  for (const year of data.years) {
    const available = data.regions.map(r => pop(r, year)).filter(v => v !== null);
    assert.equal(available.length, year < 2012 ? 16 : 17);
    assert.ok(available.every(Number.isSafeInteger));
    assert.equal(available.reduce((a, b) => a + b, 0), data.nationalTotals[year]);
  }
  assert.equal(data.nationalTotals[1970], 32240827);
  assert.equal(pop(byCode['11'], 1970), 5685932);
});

test('Sejong is never zero-filled or compared to an invented 1970 baseline', () => {
  assert.equal(pop(byCode['29'], 1970), null);
  assert.equal(pop(byCode['29'], 2011), null);
  assert.equal(pop(byCode['29'], 2012), 102157);
  assert.equal(change(byCode['29'], 2025), null);
  assert.match(label(byCode['29'], 2025), /기준 자료 없음/);
  assert.match(label(byCode['29'], 1970), /해당 연도 자료 없음/);
  assert.equal(pop(byCode['11'], 2026), null);
});

test('both statistical modes retain their own baselines and population series', () => {
  assert.equal(baselineYear, 2014);
  assert.equal(change(byCode['11'], 1970), 0);
  assert.equal(populationChange(districtByCode['11010'], 2014), 0);
  assert.notEqual(change(byCode['11'], 2014), 0);
  assert.match(period(2022), /과거/);
  assert.match(period(2023), /전망/);
  assert.match(period(2025), /전망/);
});

test('public source snapshots remain verifiable by checksum', () => {
  for (const source of data.sources) {
    const bytes = fs.readFileSync(new URL('../' + source.file, import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.ok(source.url.startsWith('https://kosis.kr/'));
  }
});

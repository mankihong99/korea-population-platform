import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { regions, regionsByCode, years, baselineYear, latestYear, pop, populationMetadata } from '../src/data/data.js';
import { populationChange, populationColor } from '../src/data/population-color.js';

const geometry = JSON.parse(fs.readFileSync(new URL('../src/data/district-paths.json', import.meta.url)));

test('all 250 map units have one source code and an integer population in each common year', () => {
  assert.equal(baselineYear, 2014);
  assert.equal(latestYear, 2025);
  assert.equal(years.length, 12);
  assert.deepEqual(regions.map(r => r.code).sort(), geometry.map(r => r.code).sort());
  for (const year of years) {
    assert.equal(new Set(regions.map(r => r.sourceCodes[year])).size, 250);
    for (const region of regions) {
      assert.ok(Number.isSafeInteger(pop(region, year)) && pop(region, year) > 0);
      assert.match(region.sourceCodes[year], /^\d{10}$/);
      assert.ok(region.sourceNames[year]);
    }
    assert.equal(regions.reduce((sum, r) => sum + pop(r, year), 0), populationMetadata.nationalTotals[year]);
  }
});

test('source CSV checksums match the imported data provenance', () => {
  for (const source of populationMetadata.sources) {
    const bytes = fs.readFileSync(new URL('../data-source/' + source.file, import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
  }
});

test('actual population values remain in persons, with no interpolation or extrapolation', () => {
  assert.equal(pop(regionsByCode['11010'], 2014), 156993);
  assert.equal(pop(regionsByCode['11010'], 2025), 137048);
  assert.equal(populationMetadata.nationalTotals[2025], 51117378);
  assert.equal(pop(regionsByCode['11010'], 2026), null);
  assert.equal(pop(regionsByCode['11010'], 2013), null);
  assert.equal(pop(null, 2020), null);
  assert.equal(pop({ values: {} }, 2020), null);
});

test('renamings and province transfers preserve the correct municipal series', () => {
  const michuhol = regionsByCode['23030'];
  assert.match(michuhol.sourceNames[2014], /남구/);
  assert.match(michuhol.sourceNames[2025], /미추홀구/);
  assert.equal(pop(michuhol, 2014), 408305);
  assert.equal(pop(michuhol, 2025), 417578);
  const gunwi = regionsByCode['37310'];
  assert.match(gunwi.sourceNames[2014], /경상북도/);
  assert.match(gunwi.sourceNames[2025], /대구광역시/);
  assert.notEqual(gunwi.sourceCodes[2014], gunwi.sourceCodes[2025]);
  assert.equal(pop(regionsByCode['31050'], 2025), 758796); // Bucheon total, not total + wards.
});

test('colors use each district baseline, including zero change and absent data', () => {
  for (const region of regions) assert.equal(populationColor(populationChange(region, baselineYear)), '#ffffff');
  const jongno = regionsByCode['11010'];
  assert.equal(populationChange(jongno, 2025), (137048 - 156993) / 156993 * 100);
  assert.ok(populationChange(jongno, 2025) < 0);
  assert.ok(regions.some(r => populationChange(r, 2025) > 0));
  assert.equal(populationChange(null, 2025), null);
  assert.equal(populationColor(null), '#ffffff');
  assert.equal(populationColor(-100), '#b91c1c');
  assert.equal(populationColor(100), '#15803d');
  assert.equal(populationColor(200), populationColor(100));
  const seoulColors = new Set(regions.filter(r => r.code.startsWith('11')).map(r => populationColor(populationChange(r, 2025))));
  assert.ok(seoulColors.size > 1, 'Districts must no longer inherit a single province color');
});

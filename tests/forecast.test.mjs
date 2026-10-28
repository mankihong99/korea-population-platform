import test from 'node:test';
import assert from 'node:assert/strict';
import { averageGrowth, forecastPopulation, forecastYears, forecastChange } from '../src/data/forecast.mjs';
import { regions } from '../src/data/data.js';

test('annual percentage changes use arithmetic mean and compound from 2025', () => {
  const region = { values: Object.fromEntries(Array.from({length: 11}, (_, i) => [2015 + i, 1000 * 1.02 ** i])) };
  assert.ok(Math.abs(averageGrowth(region, 5) - .02) < 1e-12);
  assert.equal(forecastPopulation(region, 2050), Math.round(region.values[2025] * 1.02 ** 25));
  assert.equal(forecastPopulation(region, 2025), region.values[2025]);
  assert.equal(forecastChange(region, 2025), 0);
  assert.equal(forecastPopulation(region, 2051), null);
  assert.equal(averageGrowth(region, 3), null);
  const alternating = {values: {2020: 100, 2021: 200, 2022: 100, 2023: 200, 2024: 100, 2025: 200}};
  assert.equal(averageGrowth(alternating), .4);
});
test('missing observations are not treated as zero; all real regions yield finite forecasts', () => {
  assert.equal(forecastPopulation(null, 2050), null);
  assert.equal(averageGrowth({values: {2025: 100}}), null);
  assert.equal(averageGrowth({values: Object.fromEntries(Array.from({length: 6}, (_, i) => [2020 + i, i ? 100 : 0]))}), null);
  for (const period of [5, 10]) for (const region of regions) for (const year of forecastYears) {
    const value = forecastPopulation(region, year, period);
    assert.ok(Number.isSafeInteger(value) && value >= 0);
  }
});

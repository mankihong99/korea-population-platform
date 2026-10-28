import { latestYear, pop } from './data.js';

export const forecastBaseYear = latestYear;
export const forecastYears = Array.from({ length: 2050 - latestYear + 1 }, (_, i) => latestYear + i);
// Arithmetic mean of annual percentage changes, not an average of population counts.
export function averageGrowth(region, period = 5) {
  if (![5, 10].includes(period)) return null;
  const rates = [];
  for (let year = latestYear - period + 1; year <= latestYear; year++) {
    const before = pop(region, year - 1), after = pop(region, year);
    if (!Number.isFinite(before) || before <= 0 || !Number.isFinite(after) || after < 0) return null;
    rates.push(after / before - 1);
  }
  return rates.reduce((sum, value) => sum + value, 0) / period;
}
export function forecastPopulation(region, year, period = 5) {
  if (!forecastYears.includes(year)) return null;
  const base = pop(region, latestYear);
  if (year === latestYear) return base;
  const rate = averageGrowth(region, period);
  if (base === null || rate === null) return null;
  const value = base * (1 + rate) ** (year - latestYear);
  return Number.isFinite(value) ? Math.round(value) : null;
}
export function forecastChange(region, year, period = 5) {
  const base = pop(region, latestYear), value = forecastPopulation(region, year, period);
  return base > 0 && value !== null ? (value / base - 1) * 100 : null;
}
export const forecastLabel = value => value === null ? '예상 자료 없음' : `${latestYear}년 대비 ${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

import data from './long-term-population.json' with { type: 'json' };

export const longTermData = data;
export const longTermRegions = data.regions;
export const longTermByCode = Object.fromEntries(data.regions.map(region => [region.code, region]));

export function longTermPopulation(region, year) {
  if (!data.years.includes(Number(year))) return null;
  const value = region?.values[year];
  return Number.isFinite(value) ? value : null;
}

export function longTermChange(region, year) {
  const base = longTermPopulation(region, data.baselineYear);
  const value = longTermPopulation(region, year);
  return base > 0 && value !== null ? (value - base) / base * 100 : null;
}

export function longTermChangeLabel(region, year) {
  if (longTermPopulation(region, year) === null) return '해당 연도 자료 없음';
  const change = longTermChange(region, year);
  if (change === null) return `${data.baselineYear}년 기준 자료 없음 · 증감률 비교 불가`;
  return `${data.baselineYear}년 대비 ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

export function longTermPeriodLabel(year) {
  return year > data.projectionBaseYear ? '전망 구간 · 2022년 기준 추계' : '과거 추계인구';
}

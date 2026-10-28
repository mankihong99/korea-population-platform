import dataset from './resident-population.json' with { type: 'json' };

export const populationMetadata = dataset;
export const years = dataset.years;
export const baselineYear = dataset.baselineYear;
export const latestYear = years.at(-1);
export const regions = dataset.districts;
export const regionsByCode = Object.fromEntries(regions.map(region => [region.code, region]));

export function pop(region, year) {
  if (!years.includes(Number(year))) return null;
  const value = region?.values[year];
  return Number.isFinite(value) ? value : null;
}

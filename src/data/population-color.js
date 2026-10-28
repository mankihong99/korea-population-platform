import { pop, baselineYear } from './data.js';

export const COLOR_LIMIT = 100;

export function populationChange(region, year) {
  const base = pop(region, baselineYear);
  if (!Number.isFinite(base) || base <= 0) return null;
  const value = pop(region, year);
  return Number.isFinite(value) ? (value - base) / base * 100 : null;
}

// A fixed scale keeps the same percentage the same color across all years.
export function populationColor(change) {
  if (!Number.isFinite(change) || change === 0) return '#ffffff';
  const intensity = Math.min(Math.abs(change) / COLOR_LIMIT, 1);
  const target = change > 0 ? [21, 128, 61] : [185, 28, 28];
  return '#' + target.map(channel => Math.round(255 + (channel - 255) * intensity)
    .toString(16).padStart(2, '0')).join('');
}

export function changeLabel(change) {
  return change === null ? '인구 데이터 없음' : `${baselineYear}년 대비 ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

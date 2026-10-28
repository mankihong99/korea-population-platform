import { open, unlink, writeFile, rename } from 'node:fs/promises';
export async function lockPolicies() {
  const path = new URL('../data-source/policies.lock', import.meta.url);
  const handle = await open(path, 'wx');
  await handle.writeFile(String(process.pid));
  return async () => { await handle.close(); await unlink(path); };
}
export async function saveJson(path, value) {
  const tmp = new URL(path.href + '.tmp');
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
  await rename(tmp, path);
}
export function freshDetail(item, detail, now = Date.now()) {
  return Boolean(detail && detail.version === item.sourceUpdatedAt && now - Date.parse(detail.fetchedAt) < 7 * 86400000 && Date.parse(detail.fetchedAt) <= now);
}
export function hydrateDetail(item, detail, now = Date.now()) {
  if (item.source !== 'welfare') return item;
  if (freshDetail(item, detail, now)) return {...item, eligibility:detail.eligibility, criteria:detail.criteria, benefit:detail.benefit, method:detail.method, detailFetchedAt:detail.fetchedAt, detailStatus:'fresh'};
  // Expired detail must never keep a verified eligibility decision alive.
  return {...item, eligibility:'', criteria:'', benefit:'', detailFetchedAt:detail?.fetchedAt || null, detailStatus:detail ? 'stale' : 'pending'};
}

import { readFile } from 'node:fs/promises';
import { saveJson } from './policy-storage.mjs';
import { resolveArea } from './policy-review.mjs';
import catalog from '../src/data/policy-regions.json' with {type:'json'};
const snapshot = JSON.parse(await readFile(new URL('../src/data/policies.json', import.meta.url), 'utf8'));
const year = Math.max(...catalog.map(r=>r.year));
const areas = [...new Set(catalog.filter(r=>r.year===year).map(r=>r.name))];
const counts = {}, queue = [];
for (const item of snapshot.items) {
  const status = item.verification?.status || 'unknown';
  counts[status] = (counts[status] || 0) + 1;
  if (status === 'verified') continue;
  const text = item.eligibility || '';
  const candidates = areas.filter(name=>text.includes(name));
  const provider = item.providerCoverage;
  const unmapped = provider?.type === 'regional' && !resolveArea(provider.province,provider.district).mapCodes.length;
  if (candidates.length || unmapped || item.verification?.reason.includes('검증 만료')) queue.push({id:item.id,title:item.title,status,reason:unmapped?'제공 지역 명칭이 코드표에 없음':candidates.length?'지원대상에 지역명 포함: 거주·전입·제외 조건 수동 대조 필요':'기존 검증 만료',candidates,provider,eligibility:text,sourceUrl:item.url,fingerprint:item.verification?.fingerprint});
}
await saveJson(new URL('../data-source/policy-review-queue.json', import.meta.url), {generatedAt:new Date().toISOString(),counts,total:queue.length,items:queue});
console.log(JSON.stringify({statuses:counts,reviewQueue:queue.length}));

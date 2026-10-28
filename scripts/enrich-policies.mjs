import { readFile, writeFile, rename } from 'node:fs/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { applyPolicyReview } from './policy-review.mjs';
import { lockPolicies, saveJson, freshDetail, hydrateDetail } from './policy-storage.mjs';
const unlock = await lockPolicies();
try {
const target = new URL('../src/data/policies.json', import.meta.url);
const cachePath = new URL('../data-source/policy-details.json', import.meta.url);
const snapshot = JSON.parse(await readFile(target, 'utf8'));
let cache = {};
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const reviews = JSON.parse(await readFile(new URL('../data-source/policy-reviews.json', import.meta.url), 'utf8'));
const limit = Number(process.env.POLICY_DETAIL_LIMIT || 100);
if (!Number.isInteger(limit) || limit < 0 || limit > 500) throw new Error('POLICY_DETAIL_LIMIT must be 0..500');
let fetched = 0, failed = 0, consecutiveFailures = 0;
const failures = [];
for (const item of snapshot.items.filter(p => p.source === 'welfare').sort((a, b) => Number(b.categories.some(c => c !== '기타')) - Number(a.categories.some(c => c !== '기타')))) {
  if (freshDetail(item, cache[item.id]) || fetched + failed >= limit || !process.env.WELFARE_SERVICE_KEY) continue;
  let failureKind = 'network';
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    const url = new URL('https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfaredetailed');
    url.searchParams.set('serviceKey', process.env.WELFARE_SERVICE_KEY);
    url.searchParams.set('servId', item.id.split(':')[1]);
    const response = await fetch(url, {signal: AbortSignal.timeout(30000), redirect: 'error'});
    const body = await response.text();
    failureKind = !response.ok ? `http-${response.status}` : 'invalid-xml';
    if (!response.ok || XMLValidator.validate(body) !== true || /<!DOCTYPE|<!ENTITY/i.test(body)) throw new Error('response');
    const parsed = new XMLParser({parseTagValue: false}).parse(body);
    const d = parsed.wantedDtl || parsed.response;
    const code = String(d?.resultCode || parsed.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode || '');
    failureKind = /^\d{1,3}$/.test(code) && !['0','00'].includes(code) ? `api-${code}` : 'schema';
    if (!d || !['0', '00'].includes(String(d.resultCode)) || d.servId !== item.id.split(':')[1]) throw new Error('schema');
    cache[item.id] = {version: item.sourceUpdatedAt, fetchedAt: new Date().toISOString(), eligibility: d.sprtTrgtCn || '', criteria: d.slctCritCn || '', benefit: d.alwServCn || '', method: d.aplyMtdCn || ''};
    fetched++;
    consecutiveFailures = 0;
    if (fetched % 20 === 0) await saveJson(cachePath, cache);
    if (fetched % 20 === 0) console.log(`상세 ${fetched}건 수집`);
  } catch {
    failed++; consecutiveFailures++;
    failures.push({id:item.id, reason:failureKind});
    if (/api-(20|22|23|29|30|31)$|http-(401|403|429)$/.test(failureKind) || consecutiveFailures >= 3) break;
  }
}
await saveJson(cachePath, cache);
snapshot.items = snapshot.items.map(item => {
  const detail = cache[item.id];
  item = hydrateDetail(item, detail);
  return applyPolicyReview(item, reviews);
});
const tmp = new URL('../src/data/policies.json.tmp', import.meta.url);
await writeFile(tmp, JSON.stringify(snapshot, null, 2) + '\n');
await rename(tmp, target);
console.log(JSON.stringify({fetched, failed, cached: Object.keys(cache).length, statuses: snapshot.items.reduce((a,p)=>(a[p.verification.status]=(a[p.verification.status]||0)+1,a),{})}));
if (limit > 0) await saveJson(new URL('../data-source/policy-detail-status.json', import.meta.url), {attemptedAt:new Date().toISOString(), fetched, failed, remaining:snapshot.items.filter(p=>p.source==='welfare'&&!freshDetail(p,cache[p.id])).length, failures});
if (failed) process.exitCode = 1;
} finally { await unlock(); }

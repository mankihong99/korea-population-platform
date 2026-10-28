import { readFile, writeFile, rename } from 'node:fs/promises';
import { configs, collect } from './policy-api.mjs';
import { applyPolicyReview } from './policy-review.mjs';
import { lockPolicies, hydrateDetail } from './policy-storage.mjs';
const unlock = await lockPolicies();
try {

const target = new URL('../src/data/policies.json', import.meta.url);
const check = process.argv.includes('--check');
const previous = JSON.parse(await readFile(target, 'utf8'));
const next = structuredClone(previous);
let failed = false;
for (const [source, config] of Object.entries(configs)) {
  const key = process.env[config.key]?.trim();
  if (check) { console.log(`${source}: ${key ? '키 설정됨 (인증 확인 전)' : '키 미설정'}`); continue; }
  if (!key) {
    next.sources[source] = { ...previous.sources[source], status: 'missing-key' };
    console.log(`${source}: 키 미설정, 기존 자료 유지`); continue;
  }
  try {
    const items = await collect(source, key);
    next.items = next.items.filter(item => item.source !== source).concat(items);
    next.sources[source] = { status: 'ready', fetchedAt: new Date().toISOString(), count: items.length };
    console.log(`${source}: ${items.length}건 수집 완료`);
  } catch {
    // 오류 객체에는 인증키가 포함된 URL이 있을 수 있으므로 출력/저장하지 않는다.
    next.sources[source] = { ...previous.sources[source], status: 'error', attemptedAt: new Date().toISOString() };
    console.error(`${source}: 수집 실패. 인증·활용승인·요청한도·응답 형식을 확인하세요. 기존 자료를 유지합니다.`);
    failed = true;
  }
}
if (!check) {
  const reviews = JSON.parse(await readFile(new URL('../data-source/policy-reviews.json', import.meta.url), 'utf8'));
  let cache = {};
  try { cache = JSON.parse(await readFile(new URL('../data-source/policy-details.json', import.meta.url), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  next.items = next.items.map(item => {
    const d = cache[item.id];
    item = hydrateDetail(item, d);
    return applyPolicyReview(item, reviews);
  });
  next.updatedAt = new Date().toISOString();
  const tmp = new URL('../src/data/policies.json.tmp', import.meta.url);
  await writeFile(tmp, JSON.stringify(next, null, 2) + '\n');
  await rename(tmp, target);
}
if (failed) process.exitCode = 1;
} finally { await unlock(); }

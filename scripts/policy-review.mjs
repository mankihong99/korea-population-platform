import { createHash } from 'node:crypto';
import catalog from '../src/data/policy-regions.json' with {type: 'json'};
import { provinceName, safeUrl } from '../src/data/policy-utils.mjs';
const latest = Math.max(...catalog.map(r => r.year));
const current = catalog.filter(r => r.year === latest);
export function resolveArea(province, district = '') {
  const full = `${provinceName(province)} ${district}`.trim();
  const matching = current.filter(r => {
    const parts = r.name.split(' ');
    const name = [provinceName(parts.shift()), ...parts].join(' ');
    return name === full || name.startsWith(full + ' ');
  });
  const mapCodes = [...new Set(matching.map(r => r.mapCode))];
  return {mapCodes, adminCodes: [...new Set(current.filter(r => mapCodes.includes(r.mapCode)).map(r => r.code))], basisYear: latest};
}
export function fingerprint(item) {
  return createHash('sha256').update(JSON.stringify([item.sourceUpdatedAt, item.eligibility, item.criteria || '', item.title])).digest('hex');
}
export function applyPolicyReview(item, reviews) {
  const provider = item.providerCoverage || (item.coverage?.type === 'regional' ? item.coverage : {type:'unknown'});
  const resolved = provider.type === 'regional' ? resolveArea(provider.province, provider.district) : {mapCodes:[], adminCodes:[], basisYear:latest};
  let coverage = resolved.mapCodes.length ? {...provider, ...resolved} : {type:'unknown'};
  let verification = {status: resolved.mapCodes.length ? 'provider-only' : 'unknown', reason: resolved.mapCodes.length ? '원자료의 제공 지역만 연결됨. 지원 대상 지역은 미검증' : '대상 지역 또는 행정구역 연결 미확인', fingerprint: fingerprint(item)};
  const review = reviews.filter(r => r.id === item.id).at(-1);
  if (review) {
    if (!review.reason || !review.reviewer || !review.reviewedAt || !safeUrl(review.sourceUrl) || !Array.isArray(review.areas)) throw new Error('invalid-review');
    if (review.fingerprint !== verification.fingerprint) verification.reason = '원자료 변경으로 이전 검증 만료. 재확인 필요';
    else {
      const areas = review.areas.map(a => ({...a, ...resolveArea(a.province, a.district)}));
      if (!areas.length || areas.some(a => !a.mapCodes.length) || !review.quote || !item.eligibility.includes(review.quote)) throw new Error('invalid-review-evidence');
      coverage = {type:'regional', province:areas[0].province, district:areas[0].district || '', mapCodes:[...new Set(areas.flatMap(a=>a.mapCodes))], adminCodes:[...new Set(areas.flatMap(a=>a.adminCodes))], basisYear:latest, evidence:review.quote};
      verification = {...verification, status:'verified', reason:review.reason, reviewedAt:review.reviewedAt, reviewer:review.reviewer, sourceUrl:review.sourceUrl, residence:review.residence || '원문 확인'};
    }
  }
  return {...item, providerCoverage:provider, coverage, verification};
}

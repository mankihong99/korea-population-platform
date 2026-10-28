import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveArea, applyPolicyReview, fingerprint } from '../scripts/policy-review.mjs';
import { regionMatches } from '../src/data/policy-utils.mjs';

test('codes distinguish identical district names, province aliases and general wards', () => {
  assert.notDeepEqual(resolveArea('서울', '중구').mapCodes, resolveArea('부산', '중구').mapCodes);
  assert.deepEqual(resolveArea('강원도', '강릉시'), resolveArea('강원특별자치도', '강릉시'));
  assert.equal(resolveArea('경기도', '수원시').mapCodes.length, 4);
  assert.equal(resolveArea('불명확', '중구').mapCodes.length, 0);
  assert.ok(!resolveArea('경상북도').mapCodes.includes('37310'));
  assert.ok(resolveArea('대구광역시').mapCodes.includes('37310'));
});
test('review requires exact evidence and expires when source changes', () => {
  const item = {id:'welfare:test', title:'지원', eligibility:'서울특별시 중구 거주자',sourceUpdatedAt:'20261028',coverage:{type:'regional',province:'서울특별시',district:'중구'}};
  const review = {id:item.id,areas:[{province:'서울특별시',district:'중구'}],quote:'서울특별시 중구 거주자',reason:'원문 대조',reviewer:'test',reviewedAt:'2026-10-28',sourceUrl:'https://www.bokjiro.go.kr/',fingerprint:fingerprint(item)};
  const verified = applyPolicyReview(item,[review]);
  assert.equal(verified.verification.status,'verified');
  assert.equal(regionMatches(verified,'서울특별시 중구'),true);
  assert.equal(regionMatches(verified,'부산광역시 중구'),false);
  assert.equal(applyPolicyReview({...item,eligibility:'지원대상 변경'},[review]).verification.status,'provider-only');
  assert.throws(()=>applyPolicyReview(item,[{...review,quote:'존재하지 않는 문구'}]));
  assert.equal(applyPolicyReview({...item,coverage:{type:'unknown'}},[]).verification.status,'unknown');
});

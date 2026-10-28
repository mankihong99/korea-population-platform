import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDetail, hydrateDetail, lockPolicies } from '../scripts/policy-storage.mjs';
import { applyPolicyReview } from '../scripts/policy-review.mjs';
test('detail expires after seven days or source revision and clears old eligibility',()=>{
  const now=Date.parse('2026-10-28T00:00:00Z');
  const item={source:'welfare',sourceUpdatedAt:'v1',eligibility:'old',benefit:'old',coverage:{type:'unknown'}};
  const detail={version:'v1',fetchedAt:'2026-10-27T00:00:00Z',eligibility:'new'};
  assert.ok(freshDetail(item,detail,now));
  assert.equal(hydrateDetail(item,detail,now).eligibility,'new');
  assert.equal(freshDetail({...item,sourceUpdatedAt:'v2'},detail,now),false);
  assert.equal(hydrateDetail(item,detail,now+8*86400000).eligibility,'');
  assert.equal(hydrateDetail(item,undefined,now).detailStatus,'pending');
  assert.equal(applyPolicyReview(hydrateDetail(item,detail,now+8*86400000),[]).verification.status,'unknown');
});
test('concurrent writes are rejected and released lock can be reacquired',async()=>{
  const unlock=await lockPolicies();
  try {await assert.rejects(lockPolicies(),{code:'EEXIST'});} finally {await unlock();}
  const next=await lockPolicies();await next();
});

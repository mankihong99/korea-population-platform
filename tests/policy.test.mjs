import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, normalize, parsePage } from '../scripts/policy-api.mjs';
import { regionMatches, safeUrl, settlementPolicies } from '../src/data/policy-utils.mjs';

test('지도 지역에는 상위 시 정책을 포함하고 다른 지역과 기타 분야는 제외', () => {
  const records = [
    { id: 'city', coverage: {type: 'regional', province: '경기도', district: '수원시'}, categories: ['주거'] },
    { id: 'province', coverage: {type: 'regional', province: '경기도', district: ''}, categories: ['청년'] },
    { id: 'other', coverage: {type: 'regional', province: '경기도', district: '성남시'}, categories: ['주거'] },
    { id: 'unknown', coverage: {type: 'unknown'}, categories: ['청년'] },
    { id: 'misc', coverage: {type: 'regional', province: '경기도', district: ''}, categories: ['기타'] },
  ];
  assert.deepEqual(settlementPolicies(records, '경기도 수원시 장안구').map(p => p.id), ['city', 'province']);
  assert.deepEqual(settlementPolicies(records, '경기도').map(p => p.id), ['city', 'province', 'other']);
  assert.deepEqual(settlementPolicies(records, ''), []);
  assert.deepEqual(settlementPolicies(records, '서울특별시 중구'), []);
  assert.equal(safeUrl('https://example.com/?a=1&amp;b=2'), 'https://example.com/?a=1&b=2');
});

test('복지 XML 단일 항목, 코드 보존, 제공 지역 매칭', () => {
  const live = parsePage('welfare', '<wantedList><resultCode>0</resultCode><totalCount>1</totalCount><servList><servId>001</servId><servNm>지원</servNm></servList></wantedList>');
  assert.equal(live.total, 1);
  assert.equal(live.rows[0].servId, '001');
  const p = parsePage('welfare', '<response><resultCode>00</resultCode><totalCount>1</totalCount><servList><servId>001</servId><servNm>주거 지원</servNm><ctpvNm>경기도</ctpvNm><sggNm>수원시</sggNm></servList></response>');
  const item = normalize('welfare', p.rows[0]);
  assert.equal(item.id, 'welfare:001');
  assert.equal(regionMatches(item, '경기도 수원시 장안구'), true);
  assert.equal(regionMatches(item, '경기도 용인시'), false);
  assert.equal(regionMatches(item, '서울특별시 중구'), false);
});
test('기관 소재지로 대상 지역을 추측하지 않는다', () => {
  const p = normalize('gov24', { 서비스ID: 'a', 서비스명: '청년 지원', 소관기관명: '서울특별시' });
  assert.equal(p.coverage.type, 'unknown');
  assert.equal(regionMatches(p, '서울특별시'), false);
  assert.deepEqual(p.categories, ['청년']);
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://example.com/?serviceKey=secret'), '');
});
test('페이지를 끝까지 수집하고 중복/누락/오류 응답은 거부한다', async () => {
  let requests = 0;
  const fetcher = async url => {
    requests++;
    assert.equal(url.searchParams.get('serviceKey'), 'a+b=');
    const page = url.searchParams.get('page');
    return { ok: true, text: async () => JSON.stringify({ totalCount: 2, data: [{ 서비스ID: page, 서비스명: '정책' }] }) };
  };
  assert.equal((await collect('gov24', 'a+b=', fetcher)).length, 2);
  assert.equal(requests, 2);
  await assert.rejects(collect('gov24', 'x', async () => ({ ok: true, text: async () => JSON.stringify({totalCount: 2, data: [{서비스ID: '1', 서비스명: '정책'}]}) })), /duplicate-page/);
  await assert.rejects(collect('gov24', 'x', async () => ({ ok: true, text: async () => '{"totalCount":1,"data":[]}' })), /incomplete-response/);
  assert.throws(() => parsePage('welfare', '<response><resultCode>30</resultCode></response>'));
  assert.throws(() => parsePage('gov24', '{"code":401}'));
  assert.throws(() => parsePage('youth', '{"result":{}}'));
});
test('온통청년 예상 스키마와 광역 명칭 변경 지원', () => {
  const p = parsePage('youth', JSON.stringify({result: {pagging: {totCount: 1}, youthPolicyList: [{plcyNo: '1', plcyNm: '청년 월세', aplyYmd: '상시'}]}}));
  assert.equal(normalize('youth', p.rows[0]).period, '상시');
  assert.equal(regionMatches({coverage: {type: 'regional', province: '강원도', district: ''}}, '강원특별자치도 춘천시'), true);
});

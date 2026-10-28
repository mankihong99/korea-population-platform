import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { categories, safeUrl } from '../src/data/policy-utils.mjs';

export const configs = {
  gov24: { key: 'GOV24_SERVICE_KEY', url: 'https://api.odcloud.kr/api/gov24/v3/serviceList' },
  youth: { key: 'YOUTH_API_KEY', url: 'https://www.youthcenter.go.kr/go/ythip/getPlcy' },
  welfare: { key: 'WELFARE_SERVICE_KEY', url: 'https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist' },
};
const str = value => value == null ? '' : String(value).trim();
export function normalize(source, row) {
  let id, title, summary, eligibility, benefit, method, period, url, updated, coverage = { type: 'unknown' };
  if (source === 'gov24') {
    id = row.서비스ID; title = row.서비스명; summary = row.서비스목적요약;
    eligibility = row.지원대상; benefit = row.지원내용; method = row.신청방법;
    period = row.신청기한; url = row.상세조회URL; updated = row.수정일시;
    // 기관 소재지는 지원 대상 지역이 아니므로 지역을 추정하지 않는다.
  } else if (source === 'youth') {
    id = row.plcyNo; title = row.plcyNm; summary = row.plcyExplnCn;
    benefit = row.plcySprtCn; eligibility = row.addAplyQlfcCndCn;
    method = row.plcyAplyMthdCn; period = row.aplyYmd;
    url = row.aplyUrlAddr || row.refUrlAddr1; updated = row.lastMdfcnDt;
    // zipCd 코드표를 검증하기 전에는 기관명/우편번호로 자격 지역을 추정하지 않는다.
  } else if (source === 'welfare') {
    id = row.servId; title = row.servNm; summary = row.servDgst;
    method = row.aplyMtdNm; url = row.servDtlLink; updated = row.lastModYmd;
    if (row.ctpvNm) coverage = { type: 'regional', province: str(row.ctpvNm), district: str(row.sggNm), evidence: '원자료 제공 지역 (신청 자격은 원문 확인)' };
  } else throw new Error('unknown-source');
  if (!str(id) || !str(title)) throw new Error('invalid-record');
  return { id: `${source}:${str(id)}`, source, title: str(title), summary: str(summary), eligibility: str(eligibility), benefit: str(benefit), method: str(method), period: str(period), url: safeUrl(url), sourceUpdatedAt: str(updated), coverage, categories: categories([title, summary, benefit].join(' ')) };
}
export function parsePage(source, body) {
  let rows, total;
  if (source === 'welfare') {
    if (XMLValidator.validate(body) !== true || /<!DOCTYPE|<!ENTITY/i.test(body)) throw new Error('invalid-xml');
    const parsed = new XMLParser({ parseTagValue: false, processEntities: false }).parse(body);
    // Live API uses wantedList; the portal schema documents response.
    const r = parsed.wantedList || parsed.response;
    if (!r || !['0', '00'].includes(str(r.resultCode))) throw new Error('api-response-error');
    rows = r.servList ? (Array.isArray(r.servList) ? r.servList : [r.servList]) : [];
    total = r.totalCount;
  } else {
    const r = JSON.parse(body);
    if (source === 'gov24') { rows = r.data; total = r.totalCount; }
    else { rows = r.result?.youthPolicyList; total = r.result?.pagging?.totCount; }
  }
  if (!Array.isArray(rows) || total == null || !Number.isSafeInteger(Number(total)) || Number(total) < 0) throw new Error('unexpected-schema');
  return { rows, total: Number(total) };
}
export async function collect(source, key, fetcher = fetch) {
  const items = [], seen = new Set();
  let expected;
  for (let page = 1; page <= 10000; page++) {
    const url = new URL(configs[source].url);
    const params = source === 'gov24' ? { serviceKey: key, page, perPage: 100, returnType: 'JSON' }
      : source === 'youth' ? { apiKeyNm: key, pageNum: page, pageSize: 100, rtnType: 'json' }
        : { serviceKey: key, pageNo: page, numOfRows: 100 };
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const response = await fetcher(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!response.ok) throw new Error('http-error');
    const result = parsePage(source, await response.text());
    if (expected !== undefined && expected !== result.total) throw new Error('total-changed-retry');
    expected = result.total;
    for (const row of result.rows) {
      const item = normalize(source, row);
      if (seen.has(item.id)) throw new Error('duplicate-page');
      seen.add(item.id); items.push(item);
    }
    if (items.length === expected) return items;
    if (!result.rows.length || items.length > expected) throw new Error('incomplete-response');
  }
  throw new Error('page-limit');
}

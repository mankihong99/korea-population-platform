import React, { useState } from 'react';
import snapshot from './data/policies.json';
import { policySources, regionMatches, safeUrl } from './data/policy-utils.mjs';
import './policy.css';

export default function PolicyPanel({ area = '', globalSearch = false }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [scope, setScope] = useState('all');
  const [limit, setLimit] = useState(20);
  const [settlementOnly, setSettlementOnly] = useState(true);
  const items = snapshot.items.filter(item =>
    (!settlementOnly || item.categories.some(tag => tag !== '기타')) &&
    (globalSearch ? (scope === 'all' || item.coverage.type === 'unknown') : regionMatches(item, area)) &&
    (category === '전체' || item.categories.includes(category)) &&
    `${item.title} ${item.summary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section id="region-policies" className="policy policy-panel" tabIndex={-1}>
    <h2>{globalSearch ? scope === 'unknown' ? '대상 지역 미확인 정책' : '전체 지역 정책 검색' : `${area ? area + ' · ' : ''}지역정착 지원정책`}</h2>
    <p>최근 수집 정책 안내 · 인구 지도에서 선택한 연도의 과거 정책이 아닙니다. 신청기간과 자격은 공식 원문에서 확인하세요.</p>
    <p aria-live="polite">{globalSearch ? scope === 'unknown' ? '지원 대상 지역을 아직 확인하지 못한 자료입니다. 특정 지역 주민이 신청할 수 있다는 의미가 아니므로 공식 원문을 확인하세요.' : '지도에서 선택한 지역과 무관한 전체 지역의 자료입니다. 다른 지역 정책과 대상 지역 미확인 정책이 포함됩니다.' : area ? `지도 선택 지역: ${area} · 해당 지역과 상위 시·도의 정책을 함께 표시합니다.` : '지도에서 지역을 클릭하면 해당 지역의 정책이 표시됩니다.'}</p>
    <div className="policy-sources">{Object.entries(policySources).map(([id, source]) => {
      const state = snapshot.sources[id];
      const old = state?.fetchedAt && Date.now() - Date.parse(state.fetchedAt) > 7 * 86400000;
      return <div key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
        <small>{id === 'greendaero' ? '공식 사이트 안내 · 자동 수집 미지원' : state?.status === 'ready' ? `${state.count}건 · 수집 ${state.fetchedAt.slice(0, 10)}` : state?.status === 'error' ? '갱신 실패 · 기존 자료가 있으면 표시' : '자료 연동 준비 중'}
        {state?.status !== 'ready' && state?.fetchedAt && ` · 이전 수집 ${state.fetchedAt.slice(0, 10)}`}{old && ' · 7일 이상 경과, 최신 공고 확인'}</small></div>;
    })}</div>
    <div className="policy-filters">
      <label>정책 검색<input type="search" value={query} placeholder="청년, 월세, 귀농 등" onChange={e => { setQuery(e.target.value); setLimit(20); }} /></label>
      <label>분야<select value={category} onChange={e => { setCategory(e.target.value); setLimit(20); }}>{['전체', '청년', '귀농귀촌', '주거', '출산·육아', '이주·정착', '기타'].map(v => <option key={v}>{v}</option>)}</select></label>
      {globalSearch && <label>검색 범위<select value={scope} onChange={e => { setScope(e.target.value); setLimit(20); }}><option value="all">전체 지역의 수집 정책</option><option value="unknown">대상 지역 미확인 정책만</option></select></label>}
    </div>
    <label><input type="checkbox" checked={settlementOnly} onChange={e => { setSettlementOnly(e.target.checked); setLimit(20); }} /> 정착 관련 분야만 보기 (청년·귀농귀촌·주거·출산·육아·이주·정착)</label>
    <p>‘제공 지역만 확인’은 운영기관의 제공 지역을 뜻하며 신청 자격을 보장하지 않습니다. 지역 연결은 2025년 행정구역 코드 기준입니다.</p>
    <p>검색 결과 {items.length.toLocaleString('ko-KR')}건 · 분야는 정책 내용의 키워드로 분류합니다.</p>
    {!snapshot.items.length ? <div className="policy-empty">아직 수집된 정책 자료가 없습니다. 위 공식 사이트에서 정책을 확인할 수 있습니다.</div> : !items.length ? <div className="policy-empty">{globalSearch ? '일치하는 자료가 없습니다. 검색어나 분야를 변경해 보세요.' : '이 지역과 검색 조건에 연결된 자료가 없습니다. 다른 지역과 대상 지역 미확인 자료는 별도의 ‘전체 지역 정책 검색’에서 확인할 수 있습니다.'} 검색 결과가 없다고 지원정책이 없는 것은 아닙니다.</div> : null}
    {items.slice(0, limit).map(item => <article key={item.id}><div>
      <small>{policySources[item.source]?.name} · {item.categories.join(' / ')} · {item.coverage.type === 'unknown' ? '지역 확인 필요' : item.coverage.type === 'national' ? '전국' : `${item.coverage.province} ${item.coverage.district}`}</small>
      <h3>{item.title}</h3><p>{item.summary}</p>
      <p><strong>{item.verification?.status === 'verified' ? '대상 지역 확인' : item.verification?.status === 'provider-only' ? '제공 지역만 확인' : '지역 미확인'}</strong> · {item.verification?.reason || '지원 대상 지역 원문 확인 필요'}</p>
      <details><summary>지역 연결 근거</summary><p>{item.coverage.evidence || '확인된 지역 근거 없음'}</p>{item.verification?.reviewedAt && <p>원문 대조: {item.verification.reviewedAt} · 거주 조건: {item.verification.residence}</p>}{item.coverage.adminCodes?.length > 0 && <p>행정구역 코드: {item.coverage.adminCodes.join(', ')} ({item.coverage.basisYear}년 기준)</p>}</details>
      <p>신청기간: {item.period || '공식 원문 확인'}</p>
      {item.detailStatus === 'stale' && <p>상세자료 갱신 대기 중입니다. 이전 지원 조건을 확정 정보로 표시하지 않으니 공식 원문을 확인하세요.</p>}
      {(item.benefit || item.eligibility || item.method) && <details><summary>지원 내용 및 신청 안내</summary>{item.benefit && <p>지원내용: {item.benefit}</p>}{item.eligibility && <p>지원대상: {item.eligibility}</p>}{item.criteria && <p>선정기준: {item.criteria}</p>}{item.method && <p>신청방법: {item.method}</p>}</details>}
      <p>{item.coverage.evidence || '신청 자격과 대상 지역은 원문 확인'}{item.sourceUpdatedAt && ` · 원문 수정: ${item.sourceUpdatedAt}`}</p>
      {safeUrl(item.url) ? <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">공식 원문 확인 ↗</a> : <a href={policySources[item.source].url} target="_blank" rel="noreferrer">제공 사이트에서 정책명 검색 ↗</a>}
    </div></article>)}
    {items.length > limit && <button type="button" onClick={() => setLimit(limit + 20)}>20건 더 보기</button>}
  </section>;
}

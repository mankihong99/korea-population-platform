import React from 'react';
import snapshot from './data/policies.json';
import { settlementPolicies } from './data/policy-utils.mjs';

export default function RegionPolicyPreview({ area }) {
  if (!area) return null;
  const items = settlementPolicies(snapshot.items, area);
  return <div className="region-policy-preview" aria-live="polite">
    <h3>{area} 정착 지원정책</h3>
    <p>지역으로 연결된 관련 정책 <strong>{items.length}건</strong></p>
    {items.length ? <ul>{items.slice(0, 3).map(item => <li key={item.id}>{item.title}</li>)}</ul> : <p>현재 자료에서 연결된 정책이 없습니다. 대상 지역이 확인되지 않은 정책은 아래에서 별도로 확인할 수 있습니다.</p>}
    <a href="#region-policies">지역 정책 목록 보기 ↓</a>
    <small>현재 수집 자료 기준 · 지원 자격과 신청기간은 원문 확인</small>
  </div>;
}

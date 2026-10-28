import React, { useState } from 'react';
import KoreaMap from './KoreaMap';
import PolicyPanel from './PolicyPanel';
import { latestYear } from './data/data';

export default function PolicyView({ area = '', selected = null, onSelect }) {
  const [globalSearch, setGlobalSearch] = useState(false);
  return <main className="policy-view">
    <div className="mode-explanation"><h2>지역정착 지원정책</h2><p>{globalSearch ? '모든 지역의 자료를 찾는 별도 검색 화면입니다. 지도 선택 지역의 정책 목록과 구분해 확인하세요.' : '지도에서 시·군·구를 선택하면 해당 지역과 상위 시·도의 현재 지원정책을 보여줍니다. 신청 자격과 기간은 원문에서 확인하세요.'}</p></div>
    {globalSearch ? <>
      <button type="button" className="policy-browse-button" onClick={() => setGlobalSearch(false)}>← 선택 지역 지도로 돌아가기{area ? ` · ${area}` : ''}</button>
      <PolicyPanel key="global" globalSearch />
    </> : <>
    <div className="policy-layout">
      <div className="mapcard policy-map"><h3>지원정책을 찾을 지역 선택</h3><KoreaMap selected={selected} onSelect={onSelect} year={latestYear} policyMode /></div>
      <PolicyPanel key={area || 'all'} area={area} />
    </div>
    <div className="policy-browse-entry"><h3>다른 지역이나 대상 지역이 미확인인 정책을 찾으시나요?</h3><p>지도와 분리된 전체 검색에서 확인할 수 있습니다.</p><button type="button" className="policy-browse-button" onClick={() => setGlobalSearch(true)}>전체 지역 정책 검색 →</button></div>
    </>}
  </main>;
}

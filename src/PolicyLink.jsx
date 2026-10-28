import React from 'react';

export default function PolicyLink({ area, onOpen }) {
  if (!area) return null;
  return <div className="region-policy-preview"><p>{area}의 현재 지원정책을 확인하세요.</p><button type="button" onClick={() => onOpen?.()}>이 지역 지원정책 보기 →</button></div>;
}

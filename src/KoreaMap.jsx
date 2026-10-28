import React, { useRef, useState } from 'react';
import { panView } from './data/map-pan.mjs';
import districts from './data/district-paths.json';
import paths from './data/province-paths.json';
import { regionsByCode, baselineYear, pop } from './data/data';
import { populationChange, populationColor, changeLabel } from './data/population-color';

// Label anchors are independent of the boundary paths so small cities stay readable.
import { provinces } from './data/map-labels';

const project = (lon, lat) => [(lon - 124.5) * 78 + 12, (38.7 - lat) * 100 + 12];

const fullView = [0, 0, 600, 600];
function fitBounds(items) {
  const x = Math.min(...items.map(d => d.bounds[0]));
  const y = Math.min(...items.map(d => d.bounds[1]));
  const right = Math.max(...items.map(d => d.bounds[2]));
  const bottom = Math.max(...items.map(d => d.bounds[3]));
  const size = Math.max(right - x, bottom - y, 8) * 1.2;
  return [(x + right - size) / 2, (y + bottom - size) / 2, size, size];
}

export default function KoreaMap({ selected, onSelect, year, forecast, policyMode = false }) {
  const getPopulation = forecast?.population || pop;
  const getChange = forecast?.change || populationChange;
  const labelChange = forecast?.label || changeLabel;
  const baseYear = forecast?.baseYear || baselineYear;
  const [provinceCode, setProvinceCode] = useState('');
  const districtCode = selected?.code || '';
  const [view, setView] = useState(fullView);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [touchPan, setTouchPan] = useState(false);
  const [mapOpen, setMapOpen] = useState(!policyMode);
  const startPan = event => {
    if (event.pointerType === 'touch' && !touchPan) return;
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    if (view[2] >= 600) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view: [...view], inverse: matrix.inverse(), moved: false };
  };
  const movePan = event => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) {
      start.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    setView(panView(start.view, dx, dy, start.inverse));
  };
  const endPan = event => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const district = districts.find(d => d.code === districtCode);
  const available = districts.filter(d => !provinceCode || d.code.startsWith(provinceCode));
  const ordered = [...available].sort((a, b) => Number(a.code === districtCode) - Number(b.code === districtCode));
  const provinceName = code => provinces[code.slice(0, 2)][1];
  const changes = Object.fromEntries(districts.map(item =>
    [item.code, getChange(regionsByCode[item.code], year)]));
  const districtName = item => regionsByCode[item.code]?.name || item.name;
  const choose = (item, zoom = false) => {
    if (zoom) setProvinceCode(item.code.slice(0, 2));
    const region = regionsByCode[item.code];
    if (region) onSelect(region);
    if (zoom) setView(fitBounds([item]));
  };
  const reset = () => { setProvinceCode(''); onSelect(null); setView(fullView); };
  const changeProvince = code => {
    setProvinceCode(code); onSelect(null);
    setView(code ? fitBounds(districts.filter(d => d.code.startsWith(code))) : fullView);
  };
  const zoom = factor => setView(([x, y, w, h]) => {
    const size = Math.max(5, Math.min(600, w * factor));
    const cx = district && w === 600 ? (district.bounds[0] + district.bounds[2]) / 2 : x + w / 2;
    const cy = district && w === 600 ? (district.bounds[1] + district.bounds[3]) / 2 : y + h / 2;
    return size === 600 ? fullView : [cx - size / 2, cy - size / 2, size, size];
  });
  return <div className={`map${policyMode && !mapOpen ? ' mobile-map-collapsed' : ''}`}>
    <div className="map-controls">
      <label>시·도 (2018년 지도 기준)<select value={provinceCode} onChange={e => changeProvince(e.target.value)}>
        <option value="">전국</option>
        {Object.entries(provinces).map(([code, [, name]]) => <option key={code} value={code}>{name}</option>)}
      </select></label>
      <label>시·군·구<select value={districtCode} onChange={e => {
        const item = districts.find(d => d.code === e.target.value);
        if (item) choose(item, true); else changeProvince(provinceCode);
      }}>
        <option value="">지역 선택</option>
        {available.map(d => <option key={d.code} value={d.code}>{provinceCode ? '' : provinceName(d.code) + ' '}{districtName(d)}</option>)}
      </select></label>
      <div className="map-zoom">
        <button type="button" onClick={() => zoom(.65)} aria-label="지도 확대" disabled={view[2] <= 5}>+</button>
        <button type="button" onClick={() => zoom(1 / .65)} aria-label="지도 축소" disabled={view[2] >= 600}>−</button>
        <button type="button" onClick={reset}>전국 보기</button>
      </div>
    </div>
    {policyMode && <button type="button" className="mobile-map-toggle" aria-expanded={mapOpen} onClick={() => { setMapOpen(!mapOpen); setTouchPan(false); }}>{mapOpen ? '지도 접기' : '지도에서 선택하기'}</button>}
    <div className="map-touch-controls"><button type="button" aria-pressed={touchPan} onClick={() => setTouchPan(!touchPan)}>{touchPan ? '지도 조작 종료' : '지도 조작 시작'}</button><span>{touchPan ? '+로 확대 후 손가락으로 지도를 이동하세요.' : '지도를 쓸어도 페이지가 스크롤됩니다. 지역 선택은 짧게 터치하세요.'}</span></div>
    <p className="map-note">+ 버튼으로 확대한 뒤 마우스로 지도를 잡아 끌어 이동하세요. 지역을 짧게 클릭하면 선택됩니다.</p>
    <svg className={`korea-map${view[2] < 600 ? ' can-pan' : ''}${dragging ? ' is-dragging' : ''}${touchPan ? ' touch-pan-enabled' : ''}`} viewBox={view.join(' ')} aria-labelledby="map-title map-description"
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}
      onPointerLeave={event => { if (!gesture.current?.moved) endPan(event); }}
      onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <title id="map-title">대한민국 시·군·구 행정구역 지도</title>
      <desc id="map-description">{policyMode ? '시·군·구를 선택하면 옆에 해당 지역의 현재 지원정책을 표시합니다. 통계청 2018년 지도 경계입니다.' : `통계청 2018년 경계 데이터의 시·군·구 250개 구역입니다. ${year}년 인구의 ${baseYear}년 대비 증가율은 초록색, 감소율은 빨간색으로 표현합니다. ${forecast ? '최근 평균 변화율에 따른 참고용 예상이며 공식 추계가 아닙니다.' : '각 시·군·구의 실제 공표 인구를 사용합니다.'}`}</desc>
      {ordered.map(item => {
        const change = changes[item.code];
        const region = regionsByCode[item.code];
        const count = getPopulation(region, year);
        const description = policyMode ? `${region?.sourceNames[year] || districtName(item)} 지원정책 보기` : `${region?.sourceNames[forecast ? baseYear : year] || provinceName(item.code) + ' ' + districtName(item)} · ${year}년 12월 ${forecast && year > baseYear ? '참고용 예상 ' : ''}${count === null ? '자료 없음' : count.toLocaleString('ko-KR') + '명'} · ${labelChange(change)}`;
        return <path key={item.code} d={item.d} fill={policyMode ? item.code === districtCode ? '#bfdbfe' : '#f8fafc' : populationColor(change)} fillRule="evenodd"
          className={'province district' + (item.code === districtCode ? ' is-selected' : '')}
          role="button" tabIndex={0} aria-label={description}
          aria-pressed={item.code === districtCode} onClick={() => choose(item)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(item); } }}>
          <title>{`${description} · 2018년 행정구역 경계`}</title>
        </path>;
      })}
      {!provinceCode && paths.map(p => <path key={p.code} d={p.d} className="province-outline" />)}
      {!provinceCode && <g className="map-labels" aria-hidden="true">
        {Object.entries(provinces).map(([code, [, label, lon, lat, dx = 0, dy = 0]]) => {
          const [x, y] = project(lon, lat);
          return <g key={code} className="map-label">
            {(dx || dy) ? <path className="label-leader" d={'M' + x + ',' + y + 'L' + (x + dx) + ',' + (y + dy)} /> : null}
            <text x={x + dx} y={y + dy} className={Number(code) < 30 ? 'city-label' : ''}>{label}</text>
          </g>;
        })}
      </g>}
    </svg>
    {!policyMode && <div className="population-legend">
      <strong>{year}년 {forecast && year > baseYear ? '참고용 예상 인구' : '12월 인구 변화'} · {baseYear}년 12월 대비</strong>
      <div className="population-scale" style={{ background: `linear-gradient(to right, ${populationColor(-100)}, ${populationColor(0)}, ${populationColor(100)})` }} />
      <div className="population-ticks"><span>−100% 감소</span><span>0%</span><span>+100% 이상 증가</span></div>
      <p>증가할수록 초록색, 감소할수록 빨간색이 진해집니다. ±100%에서 가장 진하게 표시합니다.</p>
      <p>변화 없음·데이터 없음: 흰색 · {forecast ? '주민등록인구 기반 단순 추세 예상 (공식 추계 아님)' : '시·군·구별 실제 주민등록인구 (외국인 제외)'}</p>
    </div>}
    <div className="district-summary" aria-live="polite">
      <strong>{district ? selected.sourceNames[forecast ? baseYear : year] || districtName(district) : provinceCode ? provinces[provinceCode][1] : '전국 시·군·구'}</strong>
      <span>{district ? '선택한 시·군·구의 경계가 강조되어 있습니다.' : '지역을 선택하면 경계를 확인할 수 있습니다.'}</span>
      {district && !policyMode && <span>{year}년 {forecast && year > baseYear ? '예상' : '12월'} · {labelChange(changes[district.code])}</span>}
      <small>{policyMode ? '정책은 현재 수집 자료 기준입니다. 지도 경계와 정책의 행정구역은 다를 수 있으므로 대상 지역을 원문에서 확인하세요.' : '인구는 각 연도 행정구역 기준이며 2018년 지도에 연결했습니다. 경계 조정·통합·편입의 영향도 포함되어, 동일 경계로 재집계한 인구 변화는 아닙니다.'}</small>
    </div>
    <p className="map-note">내부 선: 시·군·구 경계 · 진한 테두리: 선택 지역</p>
    <p className="map-source">경계: <a href="https://github.com/southkorea/southkorea-maps/tree/master/kostat/2018" target="_blank" rel="noreferrer">통계청 2018 / southkorea-maps 재배포본</a> · 250개 구역 (일반구 포함)</p>
  </div>;
}

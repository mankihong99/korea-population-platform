import React, { lazy, Suspense, useEffect, useState } from 'react';
import { MapPin, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import YearControls from './YearControls';
import KoreaMap from './KoreaMap';
import LongTermView from './LongTermView';
import ForecastView from './ForecastView';
import { regions, pop, years, baselineYear, latestYear, populationMetadata } from './data/data';
import PolicyLink from './PolicyLink';
import { populationChange, changeLabel } from './data/population-color';
import { longTermByCode } from './data/long-term';

const fmt = value => value === null ? '자료 없음' : value.toLocaleString('ko-KR') + '명';
const PolicyView = lazy(() => import('./PolicyView'));

export default function App() {
  const [mode, setMode] = useState('long-term');
  const [policyArea, setPolicyArea] = useState('');
  const [districtSelection, setDistrictSelection] = useState(null);
  const [provinceSelection, setProvinceSelection] = useState('');
  const selectDistrict = region => {
    setDistrictSelection(region);
    setPolicyArea(region?.sourceNames[latestYear] || '');
  };
  const selectProvince = (code, name) => {
    setProvinceSelection(code);
    setDistrictSelection(null);
    setPolicyArea(name || '');
  };
  const openPolicies = () => {
    if (mode === 'long-term') {
      setPolicyArea(longTermByCode[provinceSelection]?.name || '');
      setDistrictSelection(null);
    } else if (mode === 'district' || mode === 'forecast') {
      setPolicyArea(districtSelection?.sourceNames[latestYear] || '');
    }
    setMode('policies');
  };
  return <div className="app">
    <header><div><b>대한민국 인구변화</b><span>& 지역정착 정보 플랫폼</span></div></header>
    <nav className="population-modes" aria-label="인구 통계 모드">
      <button type="button" aria-pressed={mode === 'long-term'} onClick={() => setMode('long-term')}><strong>장기 변화</strong><span>시·도 · 1970~2025 · 추계인구</span></button>
      <button type="button" aria-pressed={mode === 'district'} onClick={() => setMode('district')}><strong>시·군·구 상세</strong><span>2014~2025 · 주민등록인구</span></button>
      <button type="button" aria-pressed={mode === 'forecast'} onClick={() => setMode('forecast')}><strong>2050 인구 전망</strong><span>시·군·구 · 2026~2050 · 참고용 예상</span></button>
      <button type="button" aria-pressed={mode === 'policies'} onClick={openPolicies}><strong>지역정착 지원정책</strong><span>지역별 혜택 · 지원대상 · 신청 안내</span></button>
    </nav>
    {mode === 'long-term' ? <LongTermView initialCode={provinceSelection} onRegionChange={selectProvince} onOpenPolicies={openPolicies} /> : mode === 'district' ? <DistrictView initialSelected={districtSelection} onRegionChange={selectDistrict} onOpenPolicies={openPolicies} /> : mode === 'forecast' ? <ForecastView initialSelected={districtSelection} onRegionChange={selectDistrict} onOpenPolicies={openPolicies} /> : <Suspense fallback={<p className="policy-loading" role="status">정책 자료를 불러오는 중입니다…</p>}><PolicyView area={policyArea} selected={districtSelection} onSelect={selectDistrict} /></Suspense>}
  </div>;
}

export function DistrictView({ initialSelected = null, onRegionChange, onOpenPolicies } = {}) {
  const [year, setYear] = useState(latestYear);
  const [playing, setPlaying] = useState(false);
  const [selected, updateSelected] = useState(initialSelected);
  const setSelected = region => { updateSelected(region); onRegionChange?.(region); };
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setYear(value => years[(years.indexOf(value) + 1) % years.length]), 700);
    return () => clearInterval(timer);
  }, [playing]);

  const current = pop(selected, year);
  const previous = pop(selected, year - 1);
  const rate = current !== null && previous > 0 ? (current - previous) / previous * 100 : null;
  const change = populationChange(selected, year);
  const chart = years.map(value => ({ year: value, population: pop(selected, value) }));
  const down = regions.filter(region => populationChange(region, year) < 0).length;
  const title = selected?.sourceNames[year] || selected?.name;

  return <div className="app">
    <main>
      <section className="hero">
        <div className="mode-explanation"><strong>시·군·구 상세 · 실제 주민등록인구</strong><p>행정안전부의 매년 12월 말 공표값입니다. 장기 모드의 추계인구와는 별도 통계이며, 색상은 2014년을 기준으로 계산합니다.</p></div>
        <div className="stats">
          <div><small>선택 시점 · 연말 기준</small><strong>{year}년 12월</strong></div>
          <div><small>전국 주민등록인구 · 외국인 제외</small><strong>{fmt(populationMetadata.nationalTotals[year] ?? null)}</strong></div>
          <div><small>{baselineYear}년 대비 감소 구역 · 총 {regions.length}개</small><strong>{down}곳</strong></div>
        </div>
        <div className="grid">
          <div className="mapcard">
            <div className="maptitle"><div><h2>시·군·구별 인구 변화 지도</h2><p>지역을 선택하면 해당 시·군·구의 실제 연도별 인구를 확인할 수 있습니다.</p></div></div>
            <YearControls year={year} playing={playing} onYearChange={setYear} onPlayingChange={setPlaying} />
            <KoreaMap selected={selected} onSelect={setSelected} year={year} />
            <div className="notice population-source">
              인구 출처: <a href={populationMetadata.sourceUrl} target="_blank" rel="noreferrer">행정안전부 주민등록 인구통계</a><br />
              {baselineYear}~{latestYear}년 매년 12월 말 공표값 · 단위: 명 · 자료 확인: {populationMetadata.retrievedAt}<br />
              현재 지도 250개 구역(일반구 포함)의 인구가 모두 확보되는 첫 연도인 {baselineYear}년을 공통 기준으로 사용합니다.<br />
              2015년부터 재외국민이 포함되어, 2014년과의 비교에는 집계 범위 변경의 영향도 있습니다.
            </div>
          </div>
          <aside>
            {selected ? <>
              <div className="location"><MapPin /><div><small>선택 시·군·구 · 해당 연도 명칭</small><h2>{title}</h2></div></div>
              <div className="numbers">
                <div><Users /><small>{year}년 12월 인구</small><b>{fmt(current)}</b></div>
                <div>{rate !== null && rate < 0 ? <TrendingDown /> : <TrendingUp />}<small>전년 12월 대비</small><b>{rate === null ? '비교 자료 없음' : `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`}</b></div>
              </div>
              <div className="chart"><h3>연말 주민등록인구 추이</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chart} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                    <XAxis dataKey="year" type="number" domain={[baselineYear, latestYear]} allowDecimals={false} />
                    <YAxis width={50} tickFormatter={value => `${(value / 10000).toFixed(0)}만`} />
                    <Tooltip labelFormatter={value => `${value}년 12월`} formatter={value => [fmt(value), '주민등록인구']} />
                    <ReferenceLine x={year} stroke="#667085" strokeDasharray="3 3" />
                    <Line type="linear" dataKey="population" name="주민등록인구" stroke="#155eef" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={'badge population-badge ' + (change === null || change === 0 ? 'neutral' : change > 0 ? 'growth' : 'decline')}>{changeLabel(change)}</div>
              <p className="population-caution">각 연도 행정구역 기준 공표값입니다. 경계 조정·통합·편입에 따른 인구 변동도 포함됩니다.</p>
            </> : <div className="empty-region"><MapPin /><h2>시·군·구를 선택하세요</h2><p>지도나 지역 목록에서 선택하면 해당 지역의 실제 인구와 연도별 추이를 표시합니다.</p></div>}
            <PolicyLink area={selected?.sourceNames[latestYear] || ''} onOpen={onOpenPolicies} />
          </aside>
        </div>
      </section>
    </main>
    <footer>대한민국 지역별 인구 변화 · 행정안전부 주민등록인구 {baselineYear}~{latestYear}년</footer>
  </div>;
}

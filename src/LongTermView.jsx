import React, { useEffect, useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import YearControls from './YearControls';
import PolicyLink from './PolicyLink';
import paths from './data/province-paths.json';
import { provinces } from './data/map-labels';
import { populationColor } from './data/population-color';
import { longTermData as data, longTermRegions as regions, longTermByCode,
  longTermPopulation as population, longTermChange as change,
  longTermChangeLabel as changeLabel, longTermPeriodLabel as periodLabel } from './data/long-term';

const latestYear = data.years.at(-1);
const fmt = value => value === null ? '자료 없음' : value.toLocaleString('ko-KR') + '명';
const controlsConfig = {
  years: data.years, baselineYear: data.baselineYear, latestYear, shortcutStep: 10,
  projectionBaseYear: data.projectionBaseYear,
  comparisonLabel: '색상 기준: 1970년 대비 추계인구 증감률',
  note: 'KOSIS 시·도별 추계인구 · 2023~2025년은 2022년 기준 전망 구간 · 주민등록인구와 별도 통계',
};

export default function LongTermView({ initialCode = '', onRegionChange, onOpenPolicies } = {}) {
  const [year, setYear] = useState(1970);
  const [playing, setPlaying] = useState(false);
  const [selectedCode, updateSelectedCode] = useState(initialCode);
  const setSelectedCode = code => { updateSelectedCode(code); onRegionChange?.(code, longTermByCode[code]?.name || ''); };
  const selected = longTermByCode[selectedCode];
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setYear(value => data.years[(data.years.indexOf(value) + 1) % data.years.length]), 700);
    return () => clearInterval(timer);
  }, [playing]);

  const comparable = regions.filter(region => change(region, year) !== null);
  const declining = comparable.filter(region => change(region, year) < 0).length;
  const chart = data.years.map(value => ({ year: value,
    past: value <= data.projectionBaseYear ? population(selected, value) : null,
    projection: value >= data.projectionBaseYear ? population(selected, value) : null,
  }));
  const orderedPaths = [...paths].sort((a, b) => Number(a.code === selectedCode) - Number(b.code === selectedCode));
  const selectedChange = change(selected, year);

  return <main>
    <section className="hero">
      <div className="mode-explanation">
        <strong>장기 변화 · 시·도별 추계인구</strong>
        <p>1970년부터의 흐름을 살펴보는 통계청·KOSIS 추계 시계열입니다. 주민등록인구와 집계 대상·기준이 달라 두 모드의 수치를 직접 이어 비교하지 않습니다.</p>
      </div>
      <div className="stats">
        <div><small>선택 연도 · {periodLabel(year)}</small><strong>{year}년</strong></div>
        <div><small>전국 총인구 · 추계 기준</small><strong>{fmt(data.nationalTotals[year] ?? null)}</strong></div>
        <div><small>1970년 대비 감소 · 비교 가능 {comparable.length}개 시·도</small><strong>{declining}곳</strong></div>
      </div>
      <div className="grid">
        <div className="mapcard">
          <div className="maptitle"><div><h2>시·도별 장기 인구 변화</h2><p>연도와 시·도를 선택해 1970년 이후 추계인구를 확인하세요.</p></div></div>
          <YearControls year={year} playing={playing} onYearChange={setYear} onPlayingChange={setPlaying} config={controlsConfig} />
          {year > data.projectionBaseYear && <p className="projection-notice">{year}년 값은 2022년 기준 추계의 전망값입니다. 해당 연도 주민등록 실측값은 ‘시·군·구 상세’에서 확인하세요.</p>}
          <div className="map">
            <div className="map-controls"><label>시·도 선택<select value={selectedCode} onChange={event => setSelectedCode(event.target.value)}>
              <option value="">지역 선택</option>
              {regions.map(region => <option key={region.code} value={region.code}>{region.name}</option>)}
            </select></label></div>
            <svg className="korea-map" viewBox="0 0 600 600" aria-labelledby="long-map-title long-map-description">
              <title id="long-map-title">시·도별 장기 추계인구 지도</title>
              <desc id="long-map-description">{year}년 추계인구의 1970년 대비 증감률입니다. 기준 자료가 없는 지역은 사선으로 표시합니다. 지도 모양은 2018년 경계입니다.</desc>
              <defs><pattern id="long-missing" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fafafa" /><path d="M0,6L6,0" stroke="#b8c1cc" strokeWidth="1" /></pattern></defs>
              {orderedPaths.map(path => {
                const region = longTermByCode[path.code];
                const value = change(region, year);
                const description = `${region.name} · ${year}년 ${periodLabel(year)} · ${fmt(population(region, year))} · ${changeLabel(region, year)}`;
                return <path key={path.code} d={path.d} fillRule="evenodd" fill={value === null ? 'url(#long-missing)' : populationColor(value)}
                  className={'province' + (selectedCode === path.code ? ' is-selected' : '')}
                  role="button" tabIndex={0} aria-label={description} aria-pressed={selectedCode === path.code}
                  onClick={() => setSelectedCode(path.code)}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedCode(path.code); } }}>
                  <title>{description}</title>
                </path>;
              })}
              <g className="map-labels" aria-hidden="true">
                {Object.entries(provinces).map(([code, [, label, lon, lat, dx = 0, dy = 0]]) => {
                  const x = (lon - 124.5) * 78 + 12, y = (38.7 - lat) * 100 + 12;
                  return <g key={code} className="map-label selectable" onClick={() => setSelectedCode(code)}>
                    {(dx || dy) ? <path className="label-leader" d={`M${x},${y}L${x + dx},${y + dy}`} /> : null}
                    <text x={x + dx} y={y + dy} className={Number(code) < 30 ? 'city-label' : ''}>{label}</text>
                  </g>;
                })}
              </g>
            </svg>
            <div className="population-legend">
              <strong>{year}년 · 1970년 대비 추계인구 증감률</strong>
              <div className="population-scale" style={{ background: `linear-gradient(to right, ${populationColor(-100)}, #fff, ${populationColor(100)})` }} />
              <div className="population-ticks"><span>−100% 감소</span><span>0%</span><span>+100% 이상 증가</span></div>
              <p>초록: 증가 · 빨강: 감소 · 흰색: 변화 없음 · 사선: 해당 연도 또는 1970년 기준 자료 없음</p>
              <p>세종은 2012년부터 인구 자료가 있으며, 1970년 대비 증감률은 계산하지 않습니다.</p>
            </div>
            <p className="map-source">경계: <a href="https://github.com/southkorea/southkorea-maps/tree/master/kostat/2018" target="_blank" rel="noreferrer">KOSTAT 2018</a> · 과거 행정구역 지도를 복원한 화면이 아닙니다.</p>
          </div>
          <div className="notice population-source">
            인구 출처: <a href={data.sourceUrl} target="_blank" rel="noreferrer">{data.source}</a><br />
            1970~2025년 · 단위: 명 · 확인: {data.retrievedAt} · 원문 공표값을 저장해 사용하며 임의 보간하지 않습니다.<br />
            2023~2025년: <a href={data.methodologyUrl} target="_blank" rel="noreferrer">2022년 기준 시·도 장래인구추계</a>의 전망 구간.<br />
            광역시 분리 이전의 소급 추계도 원자료 그대로 사용합니다. 경계 변경의 영향이 포함될 수 있어, 색상을 출생·사망·이동만의 변화로 해석할 수 없습니다.
          </div>
        </div>
        <aside>{selected ? <>
          <div className="location"><MapPin /><div><small>선택 시·도 · 추계인구</small><h2>{selected.name}</h2></div></div>
          <div className="numbers"><div><Users /><small>{year}년</small><b>{fmt(population(selected, year))}</b></div><div><small>1970년 기준값</small><b>{fmt(population(selected, 1970))}</b></div></div>
          <p className={year > data.projectionBaseYear ? 'projection-notice' : 'population-caution'}>{periodLabel(year)} · 주민등록인구와 다른 통계</p>
          <div className="chart"><h3>장기 추계인구 추이</h3>
            <ResponsiveContainer width="100%" height={220}><LineChart data={chart} margin={{ left: 0, right: 12, top: 8 }}>
              <XAxis dataKey="year" type="number" domain={[1970, latestYear]} ticks={[1970, 1990, 2010, latestYear]} />
              <YAxis width={55} tickFormatter={value => `${Math.round(value / 10000)}만`} />
              <Tooltip labelFormatter={value => `${value}년 · ${periodLabel(Number(value))}`} formatter={value => [fmt(value), '추계인구']} />
              <ReferenceLine x={year} stroke="#666666" strokeDasharray="3 3" />
              <Line type="linear" dataKey="past" name="과거 추계" stroke="var(--chart-ink, #111111)" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="linear" dataKey="projection" name="전망" stroke="#b45309" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart></ResponsiveContainer>
            <p className="population-caution">실선: 과거 추계 · 주황 점선: 2022년 이후 전망 연결 구간</p>
          </div>
          <div className={'badge population-badge ' + (selectedChange === null || selectedChange === 0 ? 'neutral' : selectedChange > 0 ? 'growth' : 'decline')}>{changeLabel(selected, year)}</div>
          <p className="population-caution">자료가 없는 연도는 0명으로 간주하거나 다른 지역의 인구로 채우지 않습니다.</p>
        </> : <div className="empty-region"><MapPin /><h2>시·도를 선택하세요</h2><p>지도나 목록에서 지역을 선택하면 장기 추계인구를 확인할 수 있습니다.</p></div>}<PolicyLink area={selected?.name || ''} onOpen={onOpenPolicies} /></aside>
      </div>
    </section>
    <footer>장기 변화 · KOSIS 시·도별 추계인구 · 1970~2025년</footer>
  </main>;
}

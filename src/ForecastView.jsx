import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import KoreaMap from './KoreaMap';
import YearControls from './YearControls';
import PolicyLink from './PolicyLink';
import { regions, pop, populationMetadata } from './data/data';
import { forecastBaseYear as base, forecastYears, averageGrowth, forecastPopulation, forecastChange, forecastLabel } from './data/forecast.mjs';

const fmt = value => value === null ? '자료 없음' : value.toLocaleString('ko-KR') + '명';
const config = {
  years: forecastYears, baselineYear: base, latestYear: 2050, shortcutStep: 5,
  projectionBaseYear: base, comparisonLabel: `색상 기준: ${base}년 실제 인구 대비`,
  note: `${base}년은 실제 기준값 · ${base + 1}~2050년은 최근 추세가 계속된다는 가정의 참고용 예상`,
};
export default function ForecastView({ initialSelected = null, onRegionChange, onOpenPolicies } = {}) {
  const [year, setYear] = useState(2050);
  const [period, setPeriod] = useState(5);
  const [selected, updateSelected] = useState(initialSelected);
  const setSelected = region => { updateSelected(region); onRegionChange?.(region); };
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setYear(value => forecastYears[(forecastYears.indexOf(value) + 1) % forecastYears.length]), 700);
    return () => clearInterval(timer);
  }, [playing]);
  const estimate = (region, value) => forecastPopulation(region, value, period);
  const change = (region, value) => forecastChange(region, value, period);
  const rate = averageGrowth(selected, period);
  const values = regions.map(region => estimate(region, year));
  const total = values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null;
  const chart = Array.from({length: 2050 - (base - period) + 1}, (_, i) => {
    const value = base - period + i;
    return { year: value, actual: value <= base ? pop(selected, value) : null, forecast: value >= base ? estimate(selected, value) : null };
  });
  return <main>
    <section className="hero">
      <div className="mode-explanation"><strong>2050 인구 전망 · 참고용 단순 추세 예상</strong><p>최근 {period}년의 전년 대비 변화율을 산술평균해 {base}년 실제 인구부터 매년 같은 비율로 계산합니다. 공식 장래인구추계가 아닙니다.</p></div>
      <div className="stats">
        <div><small>선택 시점</small><strong>{year}년 {year === base ? '실제' : '예상'}</strong></div>
        <div><small>250개 구역 합계 · {year === base ? '실제 인구' : '개별 지역 예상의 합'}</small><strong>{fmt(total)}</strong></div>
        <div><small>{base}년 대비 감소 구역</small><strong>{regions.filter(region => change(region, year) < 0).length}곳</strong></div>
      </div>
      <div className="grid">
        <div className="mapcard">
          <div className="maptitle"><div>
          <h2>시·군·구별 인구 전망 · 2050년까지</h2>
          <p>지역과 연도를 선택해 최근 인구 변화율에 따른 참고용 예상을 확인하세요.</p>
          <label className="forecast-period">평균 변화율 기준 <select value={period} onChange={e => { setPeriod(Number(e.target.value)); setPlaying(false); }}><option value={5}>최근 5년 ({base - 5}~{base})</option><option value={10}>최근 10년 ({base - 10}~{base})</option></select></label>
          </div></div>
          <YearControls year={year} playing={playing} onYearChange={setYear} onPlayingChange={setPlaying} config={config} />
          <KoreaMap year={year} selected={selected} onSelect={setSelected} forecast={{ population: estimate, change, label: forecastLabel, baseYear: base }} />
        </div>
        <aside>{selected ? <>
          <div className="location"><div><small>{base}년 행정구역 명칭</small><h2>{selected.sourceNames[base]}</h2></div></div>
          <div className="numbers"><div><small>{year}년 {year === base ? '실제 인구' : '예상 인구'}</small><b>{fmt(estimate(selected, year))}</b></div><div><small>최근 {period}년 연간 변화율의 평균</small><b>{rate === null ? '자료 없음' : `${rate > 0 ? '+' : ''}${(rate * 100).toFixed(2)}%`}</b></div></div>
          <div className="chart"><h3>실제 인구와 2050년까지 예상</h3>
            <ResponsiveContainer width="100%" height={240}><LineChart data={chart} margin={{left: 0, right: 12, top: 8}}>
              <XAxis dataKey="year" type="number" domain={[base - period, 2050]} ticks={[base - period, base, 2030, 2040, 2050]} />
              <YAxis width={55} tickFormatter={value => `${Math.round(value / 10000)}만`} />
              <Tooltip labelFormatter={value => `${value}년 · ${value > base ? '참고용 예상' : '실제'}`} formatter={(value, name) => [fmt(value), name]} />
              <ReferenceLine x={base} stroke="#737373" label="예상 시작" />
              <Line dataKey="actual" name="실제 주민등록인구" stroke="var(--chart-ink, #111111)" dot={false} connectNulls={false} />
              <Line dataKey="forecast" name="단순 추세 예상" stroke="#b45309" strokeDasharray="5 4" dot={false} connectNulls={false} />
            </LineChart></ResponsiveContainer>
            <p>실선: 실제 · 주황 점선: 참고용 예상</p>
          </div>
          <p className="population-caution">{forecastLabel(change(selected, year))} · {base}년 기준 인구 {fmt(pop(selected, base))}</p>
        </> : <div className="empty-region"><h2>시·군·구를 선택하세요</h2><p>지역별 평균 변화율과 실제·예상 인구 그래프를 확인할 수 있습니다.</p></div>}
          <div className="notice"><strong>해석 시 유의사항</strong><p>출생·사망·고령화·이동·정책 변화를 별도로 반영하지 않습니다. 행정구역 개편이나 일시적 급증도 평균에 포함되며, 먼 미래에는 오차가 커질 수 있습니다. 5년·10년 결과는 서로 다른 추세 가정이며 신뢰구간이 아닙니다.</p></div>
          <PolicyLink area={selected?.sourceNames[base] || ''} onOpen={onOpenPolicies} />
        </aside>
      </div>
      <div className="notice population-source">계산식: {base}년 인구 × (1 + 연간 변화율의 산술평균)^(선택 연도 − {base})<br />평균은 매년 (해당 연도 인구 ÷ 전년 인구 − 1)로 계산합니다. 표시는 명 단위로 반올림합니다.<br />기초자료: <a href={populationMetadata.sourceUrl} target="_blank" rel="noreferrer">행정안전부 주민등록인구</a> · 외국인 제외 · 자료 확인 {populationMetadata.retrievedAt}</div>
    </section>
    <footer>2050 인구 전망 · 최근 추세 기반 참고용 예상 · 공식 추계 아님</footer>
  </main>;
}

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import YearControls from './YearControls';
import PolicyLink from './PolicyLink';
import paths from './data/province-paths.json';
import { provinces } from './data/map-labels';
import { populationColor } from './data/population-color';
import { projectionData as data, projectionByCode, projectionValue, projectionChange } from './data/official-projection.mjs';

const base=data.baselineYear;
const fmt=value=>Number.isFinite(value)?value.toLocaleString('ko-KR')+'명':'자료 없음';
const nameOf=region=>region?.code==='32'?'강원특별자치도':region?.code==='35'?'전북특별자치도':region?.name || '';
const config={years:data.years,baselineYear:base,latestYear:2072,shortcutStep:5,projectionBaseYear:2022,comparisonLabel:'색상 기준: 2025년 추계인구 대비',note:'2025~2072년 모두 2022년 기준 공식 추계의 전망값입니다. 2025년 주민등록 실측값이 아닙니다.'};
export default function ForecastView({initialCode='',initialSelected=null,onRegionChange,onOpenPolicies}={}){
  const sourceProvince=initialSelected?.sourceNames?.[2025]?.split(' ')[0];
  const inherited=data.regions.find(r=>nameOf(r)===sourceProvince)?.code;
  const [code,setCode]=useState(inherited||initialCode);
  const [year,setYear]=useState(2072);
  const [playing,setPlaying]=useState(false);
  const region=projectionByCode[code]||data.national;
  const availableYears=code ? data.provinceYears : data.years;
  const endYear=availableYears.at(-1);
  const controlsConfig={...config,years:availableYears,latestYear:endYear};
  const values=projectionValue(region,year), baseline=projectionValue(region,base);
  const change=projectionChange(region,year);
  const choose=value=>{setPlaying(false);setCode(value);onRegionChange?.(value,nameOf(projectionByCode[value]));};
  useEffect(()=>{
    if(!playing)return;
    const timer=setInterval(()=>setYear(y=>availableYears[(availableYears.indexOf(y)+1)%availableYears.length]),700);
    return ()=>clearInterval(timer);
  },[playing,code]);
  const chart=availableYears.map(y=>({year:y,...projectionValue(region,y)}));
  return <main><section className="hero">
    <div className="mode-explanation"><strong>2072 인구 전망 · 공식 시·도 장래인구추계</strong><p>2022년 기준 KOSIS 장래인구추계의 공표값을 사용합니다. 공식 추계에 출생·사망·이동 가정과 연령구조 변화가 반영되어 있습니다.</p></div>
    <div className="stats"><div><small>선택 연도 · 공식 전망값</small><strong>{year}년</strong></div><div><small>{nameOf(region)} 총인구 · 추계 기준</small><strong>{fmt(values.total)}</strong></div><div><small>65세 이상 비중 · {nameOf(region)}</small><strong>{(values.older/values.total*100).toFixed(1)}%</strong></div></div>
    <div className="grid"><div className="mapcard">
      <div className="maptitle"><div><h2>공식 인구 전망 · 전국 2072년까지</h2><p>시·도를 선택하면 성별 인구와 연령계층별 변화를 함께 확인할 수 있습니다.</p></div></div>
      <YearControls year={year} playing={playing} onYearChange={setYear} onPlayingChange={setPlaying} config={controlsConfig}/>
      <div className="map"><div className="map-controls"><label>시·도 선택<select value={code} onChange={e=>choose(e.target.value)}><option value="">전국</option>{data.regions.map(r=><option key={r.code} value={r.code}>{nameOf(r)}</option>)}</select></label></div>
        <svg className="korea-map" viewBox="0 0 600 600" aria-labelledby="projection-title projection-description">
          <defs><pattern id="projection-missing" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fafafa"/><path d="M0,6L6,0" stroke="#aaa"/></pattern></defs><title id="projection-title">시·도별 공식 장래인구추계 지도</title><desc id="projection-description">{year}년 추계인구의 2025년 대비 증감률입니다. 선택하면 연령·성별 인구를 표시합니다.</desc>
          {paths.map(p=>{const r=projectionByCode[p.code], diff=projectionChange(r,year);return <path key={p.code} d={p.d} fill={diff===null?'url(#projection-missing)':populationColor(diff)} fillRule="evenodd" className={'province'+(code===p.code?' is-selected':'')} role="button" tabIndex={0} aria-pressed={code===p.code} aria-label={`${nameOf(r)} · ${year}년 추계인구 ${fmt(r.values[year]?.total)}`} onClick={()=>choose(p.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p.code);}}}><title>{diff===null ? `${nameOf(r)} · 해당 연도 자료 없음` : `${nameOf(r)} · 2025년 대비 ${diff.toFixed(1)}%`}</title></path>;})}
          <g className="map-labels" aria-hidden="true">{Object.entries(provinces).map(([key,[,label,lon,lat,dx=0,dy=0]])=><g key={key} className="map-label"><text x={(lon-124.5)*78+12+dx} y={(38.7-lat)*100+12+dy} className={Number(key)<30?'city-label':''}>{label}</text></g>)}</g>
        </svg>
        <div className="population-legend"><strong>{year}년 · 2025년 대비 추계인구 증감률</strong><div className="population-scale" style={{background:`linear-gradient(to right, ${populationColor(-100)}, #fff, ${populationColor(100)})`}}/><div className="population-ticks"><span>−100% 감소</span><span>0%</span><span>+100% 이상 증가</span></div><p>초록: 증가 · 빨강: 감소 · 흰색: 변화 없음 · 사선: 해당 연도 시·도 자료 없음</p></div>
        <p className="map-source">지도 경계: KOSTAT 2018 · 공식 추계의 행정구역과 다를 수 있습니다. 시·군·구로 임의 배분하지 않습니다.</p>
      </div>
    </div><aside>
      <div className="location"><div><small>선택 지역 · 공식 추계 기준</small><h2>{nameOf(region)}</h2></div></div>
      <div className="numbers"><div><small>2025년 추계인구</small><b>{fmt(baseline.total)}</b></div><div><small>2025년 대비 변화</small><b>{change>0?'+':''}{change.toFixed(1)}%</b></div></div>
      <table className="projection-table"><caption>{year}년 성별·연령계층별 인구</caption><thead><tr><th scope="col">구분</th><th scope="col">인구</th><th scope="col">비중</th></tr></thead><tbody>{[['남자','male'],['여자','female'],['0~14세','young'],['15~64세','working'],['65세 이상','older']].map(([label,key])=><tr key={key}><th scope="row">{label}</th><td>{fmt(values[key])}</td><td>{(values[key]/values.total*100).toFixed(1)}%</td></tr>)}</tbody></table>
      <p className="population-caution">성별 합계와 연령계층 합계는 각각 총인구입니다. 15~64세는 총인구에서 0~14세와 65세 이상을 뺀 값입니다.</p>
      <div className="chart"><h3>총인구와 고령인구 전망</h3><ResponsiveContainer width="100%" height={240}><LineChart data={chart} margin={{left:0,right:12,top:8}}><XAxis dataKey="year" type="number" domain={[2025,endYear]} ticks={[2025,...[2030,2040,2050,2060,2070].filter(y=>y<endYear),endYear]}/><YAxis width={55} tickFormatter={v=>`${Math.round(v/10000)}만`}/><Tooltip labelFormatter={v=>`${v}년 · 공식 전망값`} formatter={(v,n)=>[fmt(v),n]}/><ReferenceLine x={year} stroke="#737373"/><Line dataKey="total" name="총인구" stroke="var(--chart-ink, #111111)" strokeDasharray="5 4" dot={false}/><Line dataKey="older" name="65세 이상" stroke="#b45309" strokeDasharray="3 3" dot={false}/></LineChart></ResponsiveContainer><p className="population-caution">총인구와 65세 이상 인구 모두 공식 전망값입니다.</p></div>
      <PolicyLink area={code?nameOf(region):''} onOpen={()=>{onRegionChange?.(code,nameOf(region));onOpenPolicies?.(code);}}/>
    </aside></div>
    <div className="notice population-source">출처: <a href={data.sourceUrl} target="_blank" rel="noreferrer">{data.source}</a> · 확인: {data.retrievedAt}<br/><a href={data.longRangeSourceUrl} target="_blank" rel="noreferrer">시도편(2022년 기준) · 부록 100년 추계 · 중위 가정</a><br/><a href={data.methodologyUrl} target="_blank" rel="noreferrer">공식 추계의 출생·사망·이동 가정 및 작성 방법</a></div>
    </section><footer>2072 인구 전망 · 전국·시도 2072년까지 · 2022년 기준 공식 장래인구추계</footer></main>;
}

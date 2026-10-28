import React from 'react';
import { Play, Pause } from 'lucide-react';
import { years, baselineYear, latestYear } from './data/data';

const defaultConfig = {
  years, baselineYear, latestYear, shortcutStep: 2,
  comparisonLabel: `색상 기준: ${baselineYear}년 12월 대비 인구 증감률`,
  note: `매년 12월 말 주민등록인구 · ${baselineYear}~${latestYear}년 공통 자료 · 2026년 연말 자료는 미공표`,
};

export default function YearControls({ year, playing, onYearChange, onPlayingChange, config = defaultConfig }) {
  const { years, baselineYear, latestYear } = config;
  const shortcuts = years.filter(value => value === baselineYear || value % config.shortcutStep === 0 || value === latestYear);
  const chooseYear = value => {
    onPlayingChange(false);
    onYearChange(Number(value));
  };
  return <div className="year-controls" role="group" aria-label="지도 표시 연도">
    <div className="year-heading">
      <label htmlFor="map-year">표시 연도
        <select id="map-year" value={year} onChange={event => chooseYear(event.target.value)}>
          {years.map(value => <option key={value} value={value}>{value}년{config.projectionBaseYear && value > config.projectionBaseYear ? ' (전망)' : ''}</option>)}
        </select>
      </label>
      <span>{config.comparisonLabel}</span>
    </div>
    <div className="year-shortcuts" aria-label="주요 연도 바로 선택">
      {shortcuts.map(value => <button key={value} type="button" aria-pressed={year === value}
        onClick={() => chooseYear(value)}>{value}년</button>)}
    </div>
    <div className="timeline">
      <button type="button" onClick={() => onPlayingChange(!playing)}
        aria-label={playing ? '연도 자동 재생 일시정지' : '연도 자동 재생'} aria-pressed={playing}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <span>{baselineYear}</span>
      <input type="range" min={baselineYear} max={latestYear} step="1" value={year}
        aria-label="지도 표시 연도" aria-valuetext={`${year}년`}
        onChange={event => chooseYear(event.target.value)} />
      <span>{latestYear}</span>
    </div>
    <p>{config.note}</p>
  </div>;
}

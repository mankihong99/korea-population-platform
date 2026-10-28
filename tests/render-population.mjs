import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// SSR smoke checks: verifies actual React output, without claiming browser QA.
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { default: App, DistrictView } = await vite.ssrLoadModule('/src/App.jsx');
  const { default: Map } = await vite.ssrLoadModule('/src/KoreaMap.jsx');
  const { default: Controls } = await vite.ssrLoadModule('/src/YearControls.jsx');
  const { regionsByCode } = await vite.ssrLoadModule('/src/data/data.js');
  const home = renderToStaticMarkup(React.createElement(App));
  assert.ok(home.includes('장기 변화'));
  assert.ok(home.includes('시·군·구 상세'));
  assert.ok(home.includes('2050 인구 전망'));
  assert.ok(home.includes('지역별 혜택 · 지원대상 · 신청 안내'));
  assert.ok(!home.includes('id="region-policies"'));
  const { default: PolicyView } = await vite.ssrLoadModule('/src/PolicyView.jsx');
  const policyView = renderToStaticMarkup(React.createElement(PolicyView, {area: '서울특별시 종로구', selected: regionsByCode['11010'], onSelect() {}}));
  assert.ok(policyView.includes('지도 선택 지역: 서울특별시 종로구'));
  assert.ok(policyView.includes('서울특별시 종로구 지원정책 보기'));
  assert.equal((policyView.match(/role="button"/g) || []).length, 250);
  assert.ok(!policyView.includes('population-legend'));
  const { default: PolicyLink } = await vite.ssrLoadModule('/src/PolicyLink.jsx');
  let policyOpened = false;
  const link = PolicyLink({area: '서울특별시 종로구', onOpen: () => { policyOpened = true; }});
  link.props.children[1].props.onClick();
  assert.equal(policyOpened, true);
  const { default: PolicyPanel } = await vite.ssrLoadModule('/src/PolicyPanel.jsx');
  const { default: Preview } = await vite.ssrLoadModule('/src/RegionPolicyPreview.jsx');
  const policies = renderToStaticMarkup(React.createElement(PolicyPanel, {area: '경기도 수원시 장안구'}));
  assert.ok(policies.includes('지도 선택 지역: 경기도 수원시 장안구'));
  assert.ok(policies.includes('id="region-policies"'));
  const preview = renderToStaticMarkup(React.createElement(Preview, {area: '경기도 수원시 장안구'}));
  assert.ok(preview.includes('지역 정책 목록 보기'));
  assert.ok(preview.includes('href="#region-policies"'));
  const { default: ForecastView } = await vite.ssrLoadModule('/src/ForecastView.jsx');
  const outlook = renderToStaticMarkup(React.createElement(ForecastView));
  assert.ok(outlook.includes('2050년 (전망)'));
  assert.ok(outlook.includes('공식 장래인구추계가 아닙니다'));
  assert.equal((outlook.match(/role="button"/g) || []).length, 250);
  assert.ok(outlook.includes('2025년 대비'));
  assert.ok(home.includes('32,240,827명'));
  assert.equal((home.match(/role="button"/g) || []).length, 17);
  assert.equal((home.match(/fill="url\(#long-missing\)"/g) || []).length, 1);
  assert.ok(home.includes('2025년 (전망)'));
  const app = renderToStaticMarkup(React.createElement(DistrictView));
  assert.ok(app.includes('51,117,378명'));
  assert.ok(app.includes('시·군·구를 선택하세요'));
  assert.ok(!app.includes('천 명'));
  assert.equal((app.match(/role="button"/g) || []).length, 250);
  const base = renderToStaticMarkup(React.createElement(Map, { selected: null, onSelect() {}, year: 2014 }));
  assert.equal((base.match(/fill="#ffffff"/g) || []).length, 250);
  const selected = renderToStaticMarkup(React.createElement(Map, { selected: regionsByCode['11010'], onSelect() {}, year: 2025 }));
  assert.ok(selected.includes('137,048명'));
  assert.equal((selected.match(/aria-pressed="true"/g) || []).length, 1);

  const calls = [];
  const tree = Controls({ year: 2025, playing: true, onYearChange: y => calls.push(y), onPlayingChange: p => calls.push(p) });
  const elements = [];
  const visit = element => {
    if (!React.isValidElement(element)) return;
    elements.push(element);
    React.Children.forEach(element.props.children, visit);
  };
  visit(tree);
  const select = elements.find(e => e.type === 'select');
  assert.equal(React.Children.count(select.props.children), 12);
  select.props.onChange({ target: { value: '2018' } });
  assert.deepEqual(calls, [false, 2018]);
  const range = elements.find(e => e.type === 'input');
  assert.equal(range.props.min, 2014);
  assert.equal(range.props.max, 2025);
  console.log('PASS: both modes render, 17 province/250 district paths, missing baseline, projection labels, year controls');
} finally {
  await vite.close();
}

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import paths from '../src/data/province-paths.json' with {type:'json'};
import { extendProjections } from './import-projection-long-range.mjs';
const root = new URL('../data-source/projection/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8'));
const years = Array.from({length:48},(_,i)=>2025+i);
const provinceYears = years;
const dashboardProvinceYears = years.filter(y=>y<=2052);
const sources = [];
const expected = {total:'총인구 (추계 기준)',older:'고령인구 (65세 이상)',young:'유소년인구 (14세 이하)'};
function read(code,kind) {
  const record = manifest.find(r=>r.code===code&&r.kind===kind);
  if (!record) throw new Error(`Missing source ${code}/${kind}`);
  const bytes = fs.readFileSync(new URL(record.file,root));
  const text = bytes.toString('utf8');
  const labels = JSON.parse(text.match(/var prdDe\s*=\s*(\[[^\]]+\])/s)?.[1] || 'null');
  const block = text.match(/var datas\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
  const series = [...block.matchAll(/name:\s*'([^']+)'[\s\S]*?data:\s*\[([^\]]*)\]/g)];
  if (!labels || series[0]?.[1] !== expected[kind] || series.length !== (kind==='total'?3:1)) throw new Error(`Schema changed ${record.file}`);
  const values = series.map(s=>s[2].replace(/,\s*$/,'').split(',').map(v=>{
    if (!/^\s*\d+\s*$/.test(v)) throw new Error(`Invalid count ${record.file}`);
    return Number(v);
  }));
  if (values.some(v=>v.length!==labels.length)) throw new Error('Length mismatch');
  sources.push({...record,sha256:createHash('sha256').update(bytes).digest('hex')});
  return Object.fromEntries((code==='00'?years:dashboardProvinceYears).map(year=>{
    const i=labels.indexOf(String(year));
    if(i<0)throw new Error(`Missing ${year}: ${record.file}`);
    return [year,values.map(v=>v[i])];
  }));
}
function region(code,name){
  const total=read(code,'total'), older=read(code,'older'), young=read(code,'young');
  const values=Object.fromEntries((code==='00'?years:dashboardProvinceYears).map(y=>{
    const [population,male,female]=total[y];
    const working=population-older[y][0]-young[y][0];
    if(population!==male+female||working<0)throw new Error(`Invalid component sum ${code}/${y}`);
    return [y,{total:population,male,female,young:young[y][0],working,older:older[y][0]}];
  }));
  return {code,name,values};
}
const national=region('00','전국');
const regions=paths.map(p=>region(p.code,p.name));
const longRangeFile='long-range/19020905.xlsx';
extendProjections(national,regions,new URL(longRangeFile,root),years);
const longRangeManifest=JSON.parse(fs.readFileSync(new URL('long-range/manifest.json',root),'utf8'));
for(const record of longRangeManifest){
  const file='long-range/'+record.file;
  sources.push({...record,code:'all',kind:record.file==='19020905.xlsx'?'age-sex':'population-share',file,sha256:createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex')});
}
for(const y of provinceYears)for(const key of ['total','male','female','young','working','older']){
  if(regions.reduce((s,r)=>s+r.values[y][key],0)!==national.values[y][key])throw new Error(`National mismatch ${y}/${key}`);
}
const result={baselineYear:2025,projectionBaseYear:2022,years,provinceYears,unit:'명',retrievedAt:sources.map(r=>r.retrievedAt).sort().at(-1).slice(0,10),
  source:'KOSIS 장래인구추계 · 2022년 기준',methodologyUrl:'https://mods.go.kr/board.es?act=view&bid=207&list_no=431113&mid=a10301010000',
  sourceUrl:manifest.find(r=>r.code==='00'&&r.kind==='total').url,
  longRangeSourceUrl:'https://kosis.kr/upsHtml/online.do?pubcode=PJ&isOnline=Y',
  longRangeScenario:'2022년 기준 시도편 · 부록 100년 추계(2052~2122) · 중위 가정',
  national,regions,sources};
fs.writeFileSync(new URL('../src/data/official-projection.json',import.meta.url),JSON.stringify(result));
console.log(JSON.stringify({regions:regions.length,years:years.length,total2025:national.values[2025],total2050:national.values[2050]}));

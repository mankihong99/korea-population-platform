import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectionData as data,projectionValue,projectionChange,projectionByCode} from '../src/data/official-projection.mjs';
test('official projections cover all provinces, years and population components',()=>{
  assert.equal(data.regions.length,17);
  assert.equal(data.years.length,48);
  for(const year of data.years){
    for(const region of [data.national,...data.regions]){
      const v=projectionValue(region,year);
      for(const n of Object.values(v))assert.ok(Number.isSafeInteger(n)&&n>=0);
      assert.equal(v.male+v.female,v.total);
      assert.equal(v.young+v.working+v.older,v.total);
    }
    for(const key of ['total','male','female','young','working','older'])assert.equal(data.regions.reduce((s,r)=>s+r.values[year][key],0),data.national.values[year][key]);
  }
});
test('published values and baseline are preserved without extrapolation',()=>{
  assert.equal(data.national.values[2025].total,51684564);
  assert.equal(data.national.values[2050].total,47106960);
  assert.equal(data.national.values[2050].older,18907853);
  assert.equal(projectionChange(projectionByCode['29'],2025),0);
  assert.equal(projectionValue(data.national,2073),null);
  assert.equal(projectionChange(null,2050),null);
});
test('all 56 downloaded source snapshots have matching checksums',()=>{
  assert.equal(data.sources.length,56);
  for(const source of data.sources){
    const body=fs.readFileSync(new URL('../data-source/projection/'+source.file,import.meta.url));
    assert.equal(createHash('sha256').update(body).digest('hex'),source.sha256);
  }
});

test('official long-range appendix extends all provinces through 2072',()=>{
 assert.equal(data.provinceYears.at(-1),2072);
 assert.equal(projectionValue(projectionByCode['11'],2052).total,7934502);
 assert.ok(projectionValue(projectionByCode['11'],2053).total>0);
 assert.equal(projectionValue(projectionByCode['11'],2072).total,6327090);
 assert.ok(projectionChange(projectionByCode['11'],2072)<0);
 assert.equal(projectionValue(data.national,2072).total,36222293);
});

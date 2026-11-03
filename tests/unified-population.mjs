import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5184,strictPort:true},logLevel:'error'});
let browser;
try{
  await server.listen();browser=await chromium.launch({channel:'msedge',headless:true});
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    await page.goto('http://127.0.0.1:5184');
    assert.equal(await page.locator('.population-modes button').count(),3);
    await page.locator('#map-year').selectOption('1980');
    await page.locator('.map-controls select').selectOption('32');
    assert.equal(await page.locator('#map-year').inputValue(),'2014');
    assert.equal(await page.locator('.map-controls select').first().inputValue(),'32');
    assert.equal(await page.locator('.korea-map path.district').count(),18);
    assert.match(await page.locator('.region-transition').innerText(),/1980년 대신 2014년/);
    await page.locator('.map-controls select').nth(1).selectOption('32020');
    await page.getByRole('heading',{name:'강원도 원주시',exact:true}).waitFor();
    await page.getByRole('button',{name:'강원도 장기 추계 보기',exact:true}).click();
    assert.equal(await page.locator('#map-year').inputValue(),'1980');
    await page.locator('#map-year').selectOption('2020');
    await page.locator('.map-controls select').selectOption('32');
    assert.equal(await page.locator('#map-year').inputValue(),'2020');
    assert.equal(await page.locator('.region-transition').count(),0);
    await page.getByRole('button',{name:'이 지역 지원정책 보기 →',exact:true}).click();
    await page.getByRole('heading',{name:'강원도 · 지역정착 지원정책',exact:true}).waitFor();
    await page.getByRole('button',{name:'지역별 인구 변화',exact:false}).click();
    assert.equal(await page.locator('.map-controls select').first().inputValue(),'32');
    await page.getByRole('button',{name:'← 전국 지도 보기',exact:true}).click();
    assert.equal(await page.locator('.korea-map path.province').count(),17);
    assert.equal(await page.locator('#map-year').inputValue(),'2020');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await context.close();console.log(`PASS ${width}px: unified navigation, province filter, year transition, return and policies`);
  }
}finally{await browser?.close();await server.close();}

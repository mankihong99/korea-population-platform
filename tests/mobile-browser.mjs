import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({server:{host:'127.0.0.1',port:5183,strictPort:true},logLevel:'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel:'msedge',headless:true});
  for (const width of [360,390,600]) {
    const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5183');
    const checkWidth = async () => assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    await checkWidth();
    await page.getByRole('button',{name:'지역정착 지원정책',exact:false}).click();
    const toggle = page.getByRole('button',{name:'지도에서 선택하기',exact:true});
    await toggle.waitFor();
    assert.equal(await page.locator('.korea-map').isVisible(),false);
    await page.locator('.map-controls select').nth(1).selectOption('11010');
    await page.getByRole('heading',{name:'서울특별시 종로구 · 지역정착 지원정책',exact:true}).waitFor();
    await checkWidth();
    await toggle.click();
    assert.equal(await page.locator('.korea-map').isVisible(),true);
    assert.equal(await page.locator('.korea-map').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
    await page.getByRole('button',{name:'지도 조작 시작',exact:true}).click();
    assert.equal(await page.locator('.korea-map').evaluate(el=>getComputedStyle(el).touchAction),'none');
    await page.getByRole('button',{name:'지도 조작 종료',exact:true}).click();
    await page.getByRole('button',{name:'지도 접기',exact:true}).click();
    await checkWidth();
    await page.getByRole('button',{name:'2050 인구 전망',exact:false}).click();
    await page.getByText('시·군·구별 인구 전망 · 2050년까지',{exact:true}).waitFor();
    await checkWidth();
    await page.getByRole('button',{name:'시·군·구 상세',exact:false}).click();
    await checkWidth();
    await context.close();
    console.log(`PASS mobile ${width}px: navigation, policy region, map toggle, touch mode, no overflow`);
  }
} finally {
  await browser?.close();
  await server.close();
}

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({server:{host:'127.0.0.1',port:5183,strictPort:true},logLevel:'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel:'msedge',headless:true});
  for(const width of [1024,1440,1920]){
    const context=await browser.newContext({viewport:{width,height:1000}});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:5183');
    await page.getByRole('button',{name:'2072 인구 전망',exact:false}).click();
    const forecast=await page.locator('.hero').boundingBox();
    const header=await page.locator('header').boundingBox();
    await page.getByRole('button',{name:'지역정착 지원정책',exact:false}).click();
    await page.locator('.policy-layout').waitFor();
    const policy=await page.locator('.policy-view').boundingBox();
    assert.equal(policy.x,forecast.x,`aligned left edge at ${width}`);
    assert.equal(policy.width,forecast.width,`same content width at ${width}`);
    assert.equal(policy.y,forecast.y,`same content start at ${width}`);
    assert.deepEqual(await page.locator('header').boundingBox(),header);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    for(const selector of ['.policy-map','.policy-panel']){
      const box=await page.locator(selector).boundingBox();
      assert.ok(box.x>=policy.x&&box.x+box.width<=policy.x+policy.width);
    }
    await page.getByRole('button',{name:'전체 지역 정책 검색 →',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'2072 인구 전망',exact:false}).click();
    assert.deepEqual(await page.locator('.hero').boundingBox(),forecast);
    await context.close();
    console.log(`PASS desktop ${width}px: forecast/policy alignment, global search, no overflow`);
  }
  for (const width of [360,390,600]) {
    const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5183');
    const checkWidth = async () => assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    await checkWidth();
    const theme = page.getByRole('button', {name:'다크모드',exact:true});
    await theme.click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await page.reload();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    assert.equal(await theme.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 18, 18)');
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
    await page.getByRole('button',{name:'2072 인구 전망',exact:false}).click();
    await page.getByText('공식 인구 전망 · 전국 2072년까지',{exact:true}).waitFor();
    await page.locator('.map-controls select').selectOption('');
    await page.locator('#map-year').selectOption('2072');
    assert.equal(await page.locator('.korea-map path[fill="url(#projection-missing)"]').count(),0);
    await page.locator('.map-controls select').selectOption('32');
    assert.equal(await page.locator('#map-year').inputValue(),'2072');
    await page.locator('#map-year').selectOption('2053');
    assert.equal(await page.locator('.korea-map path[fill="url(#projection-missing)"]').count(),0);
    await page.locator('.korea-map path.province').first().press('Enter');
    assert.equal(await page.locator('#map-year').inputValue(),'2053');
    await page.locator('.map-controls select').selectOption('32');
    await page.locator('#map-year').selectOption('2030');
    await page.getByRole('heading',{name:'강원특별자치도',exact:true}).waitFor();
    await page.getByRole('button',{name:'이 지역 지원정책 보기 →',exact:true}).click();
    await page.getByRole('heading',{name:'강원도 · 지역정착 지원정책',exact:true}).waitFor();
    await checkWidth();
    await page.getByRole('button',{name:'지역별 인구 변화',exact:false}).click();
    await checkWidth();
    await theme.click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    await context.close();
    console.log(`PASS mobile ${width}px: navigation, policy region, map toggle, touch mode, no overflow`);
  }
} finally {
  await browser?.close();
  await server.close();
}

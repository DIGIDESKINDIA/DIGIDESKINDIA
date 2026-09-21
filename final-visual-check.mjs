import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });

const scroller = page.locator('.dd-editor-shell').last();

const getMetrics = async () => page.evaluate(() => {
  const toolbar = document.querySelector('.toolbar-shell');
  const apply = Array.from(document.querySelectorAll('button')).find((el) => el.textContent && el.textContent.includes('Apply changes'));
  const scrollerEl = Array.from(document.querySelectorAll('.dd-editor-shell')).find((el) => getComputedStyle(el).overflowY === 'auto');
  const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
  const applyRect = apply ? apply.getBoundingClientRect() : null;
  const scrollerRect = scrollerEl ? scrollerEl.getBoundingClientRect() : null;
  const pages = Array.from(document.querySelectorAll('[data-scroll-page]'));
  return {
    toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
    apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
    scroller: scrollerRect ? { scrollTop: scrollerEl.scrollTop, scrollHeight: scrollerEl.scrollHeight, clientHeight: scrollerEl.clientHeight, top: scrollerRect.top, height: scrollerRect.height } : null,
    firstPageTop: pages[0] ? pages[0].getBoundingClientRect().top : null,
    lastPageTop: pages[pages.length - 1] ? pages[pages.length - 1].getBoundingClientRect().top : null,
    lastPageBottom: pages[pages.length - 1] ? pages[pages.length - 1].getBoundingClientRect().bottom : null,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  };
});

await page.screenshot({ path: 'final-top.png', fullPage: false });
const top = await getMetrics();

await scroller.evaluate((el) => {
  el.scrollTop = Math.max(0, el.scrollHeight * 0.55);
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'final-middle.png', fullPage: false });
const middle = await getMetrics();

await scroller.evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'final-bottom.png', fullPage: false });
const bottom = await getMetrics();

console.log(JSON.stringify({ top, middle, bottom }, null, 2));
await browser.close();

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });

const scrollerInfo = await page.evaluate(() => {
  const candidates = Array.from(document.querySelectorAll('.dd-editor-shell')).map((el) => ({
    className: el.className,
    overflowY: getComputedStyle(el).overflowY,
    overflowX: getComputedStyle(el).overflowX,
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    height: el.getBoundingClientRect().height,
    top: el.getBoundingClientRect().top,
  }));
  return candidates;
});
console.log('SCROLLERS', JSON.stringify(scrollerInfo, null, 2));

const scroller = page.locator('.dd-editor-shell').last();
const top = await page.evaluate(() => {
  const toolbar = document.querySelector('.dd-toolbar-scroll');
  const apply = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Apply changes'));
  const toolbarRect = toolbar?.getBoundingClientRect();
  const applyRect = apply?.getBoundingClientRect();
  return {
    toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
    apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    pageCount: document.querySelectorAll('[data-scroll-page]').length,
  };
});
await page.screenshot({ path: 'behavior-top.png', fullPage: false });

await scroller.evaluate((el) => {
  el.scrollTop = Math.max(0, el.scrollHeight * 0.6);
});
await page.waitForTimeout(400);
const deep = await page.evaluate(() => {
  const toolbar = document.querySelector('.dd-toolbar-scroll');
  const apply = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Apply changes'));
  const toolbarRect = toolbar?.getBoundingClientRect();
  const applyRect = apply?.getBoundingClientRect();
  const pages = Array.from(document.querySelectorAll('[data-scroll-page]'));
  return {
    toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
    apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
    pageTop: pages[0]?.getBoundingClientRect().top,
    pageBottom: pages[pages.length - 1]?.getBoundingClientRect().bottom,
    toolbarVisible: !!(toolbarRect && toolbarRect.top >= 0 && toolbarRect.bottom <= window.innerHeight),
  };
});
await page.screenshot({ path: 'behavior-deep-scroll.png', fullPage: false });

await scroller.evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(400);
const bottom = await page.evaluate(() => {
  const toolbar = document.querySelector('.dd-toolbar-scroll');
  const apply = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Apply changes'));
  const toolbarRect = toolbar?.getBoundingClientRect();
  const applyRect = apply?.getBoundingClientRect();
  const pages = Array.from(document.querySelectorAll('[data-scroll-page]'));
  return {
    toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
    apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
    firstTop: pages[0]?.getBoundingClientRect().top,
    lastTop: pages[pages.length - 1]?.getBoundingClientRect().top,
    lastBottom: pages[pages.length - 1]?.getBoundingClientRect().bottom,
    toolbarVisible: !!(toolbarRect && toolbarRect.top >= 0 && toolbarRect.bottom <= window.innerHeight),
  };
});
await page.screenshot({ path: 'behavior-bottom.png', fullPage: false });
console.log(JSON.stringify({ top, deep, bottom }, null, 2));
await browser.close();

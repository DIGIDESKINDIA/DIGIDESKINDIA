import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.setInputFiles('input[type="file"]', 'D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 30000 });

const probe = await page.evaluate(() => {
  const candidates = [...document.querySelectorAll('.dd-editor-shell')].map((el, index) => ({
    index,
    className: el.className,
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    pageCount: el.querySelectorAll('[data-scroll-page]').length,
    rect: el.getBoundingClientRect()
  }));
  return candidates;
});

const scroller = await page.evaluateHandle(() => {
  const list = [...document.querySelectorAll('.dd-editor-shell')];
  return list.find((el) => el.scrollHeight > el.clientHeight && el.querySelectorAll('[data-scroll-page]').length > 0) ?? list[0] ?? null;
});

const before = await page.evaluate((el) => ({
  scrollTop: el.scrollTop,
  scrollHeight: el.scrollHeight,
  clientHeight: el.clientHeight
}), scroller);
const mid = Math.max(0, Math.round((before.scrollHeight - before.clientHeight) / 2));
await page.evaluate(({ el, top }) => { el.scrollTop = top; }, { el: scroller, top: mid });
await page.waitForTimeout(600);

const after = await page.evaluate((el) => ({
  scrollTop: el.scrollTop,
  scrollHeight: el.scrollHeight,
  clientHeight: el.clientHeight,
  pageTop: [...document.querySelectorAll('[data-scroll-page]')].slice(0, 3).map((node) => ({
    top: node.getBoundingClientRect().top,
    bottom: node.getBoundingClientRect().bottom,
    page: node.dataset.scrollPage
  }))
}), scroller);

console.log(JSON.stringify({ before, mid, after, probe }, null, 2));
await browser.close();

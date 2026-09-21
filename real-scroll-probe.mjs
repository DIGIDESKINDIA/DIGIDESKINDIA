import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });

const pageEls = Array.from(document.querySelectorAll('[data-scroll-page]'));
const before = pageEls[0].getBoundingClientRect().top;

const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
  const s = getComputedStyle(el);
  const tag = el.tagName;
  return (tag === 'DIV' || tag === 'MAIN' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'HTML' || tag === 'BODY') && (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowY === 'hidden');
}).map((el) => {
  const s = getComputedStyle(el);
  return {
    tag: el.tagName,
    className: el.className,
    overflowY: s.overflowY,
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    top: el.getBoundingClientRect().top,
    height: el.getBoundingClientRect().height,
    selector: (() => {
      const parts = [];
      let node = el;
      while (node && node !== document.body && node !== document.documentElement && parts.length < 6) {
        const tag = node.tagName.toLowerCase();
        const className = node.className && typeof node.className === 'string' ? node.className.split(/\s+/).slice(0, 3).join('.') : '';
        parts.unshift(tag + (className ? '.' + className : ''));
        node = node.parentElement;
      }
      return parts.join(' > ');
    })(),
  };
});

for (const candidate of candidates.filter((c) => c.scrollHeight > c.clientHeight)) {
  candidate.beforeTop = before;
  candidate.beforeScrollTop = candidate.scrollTop;
  candidate.scrollTop = Math.max(0, candidate.scrollHeight - candidate.clientHeight) * 0.5;
}

await page.waitForTimeout(1000);

const after = Array.from(document.querySelectorAll('[data-scroll-page]'))[0].getBoundingClientRect().top;

console.log(JSON.stringify({
  pageCount: pageEls.length,
  beforeTop: before,
  afterTop: after,
  delta: before - after,
  candidates: candidates.filter((c) => c.scrollHeight > c.clientHeight).slice(0, 20),
}, null, 2));

await browser.close();

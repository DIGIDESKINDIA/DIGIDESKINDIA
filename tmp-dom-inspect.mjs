import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });

const data = await page.evaluate(() => {
  const shells = Array.from(document.querySelectorAll('.dd-editor-shell')).map((el, index) => {
    const style = getComputedStyle(el);
    return {
      index,
      className: el.className,
      overflowY: style.overflowY,
      overflowX: style.overflowX,
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      top: el.getBoundingClientRect().top,
      height: el.getBoundingClientRect().height,
      children: Array.from(el.children).slice(0, 4).map((child) => ({
        tag: child.tagName,
        className: child.className,
        top: child.getBoundingClientRect().top,
        height: child.getBoundingClientRect().height,
      })),
    };
  });
  return shells;
});

console.log(JSON.stringify(data, null, 2));
await browser.close();

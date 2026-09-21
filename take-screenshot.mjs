import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });
await page.waitForTimeout(2000);

// Take screenshot of the top area
await page.screenshot({ path: 'debug-top.png', fullPage: false });

// Now let's also get the full DOM tree structure with backgrounds
const domTree = await page.evaluate(() => {
  function walk(el, depth) {
    if (!el || depth > 8) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 20) return null;
    const cs = getComputedStyle(el);
    const bgColor = cs.backgroundColor;
    const hasBg = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
    const node = {
      tag: el.tagName,
      cls: el.className ? el.className.substring(0, 80) : '',
      rect: { l: Math.round(rect.left), t: Math.round(rect.top), r: Math.round(rect.right), b: Math.round(rect.bottom) },
      bg: hasBg ? bgColor : null,
      children: [],
    };
    for (const child of el.children) {
      const childNode = walk(child, depth + 1);
      if (childNode) node.children.push(childNode);
    }
    return node;
  }
  return walk(document.body, 0);
});

console.log(JSON.stringify(domTree, null, 2));
await browser.close();

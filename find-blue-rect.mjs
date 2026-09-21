import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles('D:/aaj/digital-desk-main (2)/digital-desk-main/test-files/multi-page.pdf');
await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });
await page.waitForTimeout(1500);

// First, let's get the overall layout structure
const layoutInfo = await page.evaluate(() => {
  const main = document.querySelector('main.dd-editor-shell');
  const applyBtn = Array.from(document.querySelectorAll('button')).find((el) => el.textContent && el.textContent.includes('Apply changes'));
  
  const getInfo = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      className: el.className.substring(0, 200),
      rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
      bg: cs.background,
      bgColor: cs.backgroundColor,
      bgImage: cs.backgroundImage,
      boxShadow: cs.boxShadow.substring(0, 100),
      border: cs.border.substring(0, 100),
      backdropFilter: cs.backdropFilter,
      opacity: cs.opacity,
    };
  };
  
  return {
    main: getInfo(main),
    applyBtn: getInfo(applyBtn),
    body: getInfo(document.body),
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
});

console.log('=== LAYOUT INFO ===');
console.log(JSON.stringify(layoutInfo, null, 2));

// Now inspect elements at specific points
const points = [
  { x: 10, y: 180, label: 'left-180' },
  { x: 10, y: 220, label: 'left-220' },
  { x: 10, y: 260, label: 'left-260' },
  { x: 1910, y: 180, label: 'right-180' },
  { x: 1910, y: 220, label: 'right-220' },
  { x: 1910, y: 260, label: 'right-260' },
];

for (const pt of points) {
  const info = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { point: { x, y }, element: null };
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      point: { x, y },
      tag: el.tagName,
      className: el.className.substring(0, 200),
      id: el.id,
      rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
      bgColor: cs.backgroundColor,
      bg: cs.background.substring(0, 100),
      bgImage: cs.backgroundImage,
      boxShadow: cs.boxShadow.substring(0, 100),
    };
  }, pt);
  console.log(`\n=== POINT ${pt.label} (${pt.x}, ${pt.y}) ===`);
  console.log(JSON.stringify(info, null, 2));
}

// Now find the element that covers y=180 to y=260 full width
const rectInfo = await page.evaluate(() => {
  // Find all elements that cover the region x: 0 to innerWidth, y: 160 to 280
  const results = [];
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const rect = el.getBoundingClientRect();
    // Check if this element covers the full width and spans y 160-280
    if (rect.left <= 5 && rect.right >= window.innerWidth - 5 && rect.top <= 280 && rect.bottom >= 160) {
      const cs = getComputedStyle(el);
      const bgColor = cs.backgroundColor;
      const bgImage = cs.backgroundImage;
      // Only include elements that have some background
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        results.push({
          tag: el.tagName,
          className: el.className.substring(0, 200),
          id: el.id,
          depth: getDepth(el),
          rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
          bgColor,
          bgImage: bgImage.substring(0, 100),
          bg: cs.background.substring(0, 100),
          boxShadow: cs.boxShadow.substring(0, 100),
        });
      }
    }
  }
  function getDepth(el) {
    let depth = 0;
    let node = el;
    while (node.parentElement) { depth++; node = node.parentElement; }
    return depth;
  }
  // Sort by depth (shallowest first)
  results.sort((a, b) => a.depth - b.depth);
  return results;
});

console.log('\n=== ELEMENTS COVERING y=160-280 FULL WIDTH WITH NON-TRANSPARENT BG ===');
console.log(JSON.stringify(rectInfo, null, 2));

await browser.close();

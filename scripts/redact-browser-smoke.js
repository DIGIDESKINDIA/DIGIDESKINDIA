const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const errors = [];

  page.on('console', (msg) => errors.push({ type: 'console', level: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => errors.push({ type: 'pageerror', text: err.toString() }));
  page.on('requestfailed', (req) => errors.push({ type: 'requestfailed', url: req.url(), error: req.failure() ? req.failure().errorText : 'unknown' }));

  await page.goto('http://localhost:3456/pdf-tools/redact-document', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const uploadPath = path.join(process.cwd(), 'test-fixtures', 'redact-one-page.pdf');
  const input = page.locator('input[type="file"]');
  const inputCount = await input.count();
  console.log('INPUT_COUNT', inputCount);

  if (inputCount === 1) {
    await input.setInputFiles(uploadPath);
    await page.waitForTimeout(6000);
    console.log('PAGE_TEXT', await page.locator('body').innerText());
    console.log('CANVAS_COUNT', await page.locator('canvas').count());
    console.log('SVG_COUNT', await page.locator('svg').count());
  }

  console.log('ERRORS', JSON.stringify(errors, null, 2));
  await browser.close();
})();

import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });

try {
  await page.goto('http://localhost:3000/pdf-tools/compress-pdf');
  await page.setInputFiles('input[type="file"]', 'tmp-ocr-output.pdf');
  await page.waitForTimeout(1500);

  const slider = page.locator('input[aria-label="Compression level"]');
  await slider.evaluate((el) => {
    el.value = '68';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.locator('button:has-text("Compress PDF")').click();
  await page.waitForSelector('text=PDF compressed successfully', { timeout: 60000 });

  const summary = await page.locator('body').innerText();
  console.log('UI_SUMMARY=' + summary.slice(summary.indexOf('Original') - 20, summary.indexOf('Download Compressed PDF')));

  const download = await Promise.race([
    page.waitForEvent('download', { timeout: 30000 }).then((result) => ({ ok: true, result })),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 30000)),
  ]);

  if (!download.ok) {
    throw new Error('No download event was received');
  }

  const filePath = await download.result.path();
  const stats = await fs.stat(filePath);
  console.log('DOWNLOAD_NAME=' + download.result.suggestedFilename());
  console.log('DOWNLOAD_BYTES=' + stats.size);
  console.log('DOWNLOAD_KB=' + (stats.size / 1024).toFixed(2));
} finally {
  await browser.close();
}

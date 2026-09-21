import { chromium } from "playwright";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const pdf = await PDFDocument.create();
const pdfPage = pdf.addPage([612, 792]);
const font = await pdf.embedFont(StandardFonts.TimesRoman);
pdfPage.drawText("TH-GAUTAM BUDDH", { x: 40, y: 700, size: 24, font, color: rgb(0, 0, 0) });
pdfPage.drawText("NAGAR NAGAR", { x: 40, y: 660, size: 24, font, color: rgb(0, 0, 0) });
const fixture = await pdf.save();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1 });

await page.goto(`${baseUrl}/pdf-tools/edit-pdf`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles({ name: "hover-fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from(fixture) });
await page.waitForFunction(() => document.querySelectorAll('[data-edit-text-id]').length > 0, { timeout: 30000 });
await page.waitForTimeout(1000);

const allWords = await page.locator('[data-edit-text-id]').evaluateAll((nodes) => nodes
  .map((node) => ({
    id: node.getAttribute("data-edit-text-id"),
    text: node.textContent,
    aria: node.getAttribute("aria-label"),
    rect: (() => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })(),
    style: { pointerEvents: getComputedStyle(node).pointerEvents, border: getComputedStyle(node).border, background: getComputedStyle(node).backgroundColor },
  })));
const words = allWords.filter((item) => /GAUTAM|NAGAR/i.test(`${item.text} ${item.aria}`));

console.log("TEXT_SAMPLE", JSON.stringify(allWords.slice(0, 80), null, 2));
console.log("WORDS", JSON.stringify(words, null, 2));

async function hoverAndAssert(target) {
  const locator = page.locator(`[data-edit-text-id][aria-label="Edit text: ${target}"]`).first();
  assert.equal(await locator.count(), 1, `Expected one ${target} word overlay`);
  const box = await locator.boundingBox();
  assert.ok(box, `Expected a DOM box for ${target}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(300);
  const snapshot = await page.evaluate(({ target, point }) => {
    const canvas = document.querySelector('[data-editor-canvas]');
    const canvasRect = canvas?.getBoundingClientRect();
    const hovered = Array.from(document.querySelectorAll('[data-edit-text-id]')).map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        id: node.getAttribute("data-edit-text-id"),
        text: node.textContent,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        containsPoint: point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom,
        green: style.border.includes("46, 204, 113") || style.backgroundColor.includes("46, 204, 113"),
        border: style.border,
        background: style.backgroundColor,
      };
    }).filter((item) => item.containsPoint || item.green);
    return {
      target,
      point,
      devicePixelRatio: window.devicePixelRatio,
      scroll: { x: window.scrollX, y: window.scrollY, container: document.querySelector('[data-pdf-scroll-root]')?.scrollTop },
      canvas: canvasRect ? { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height } : null,
      pageRelative: canvasRect ? { x: ((point.x - canvasRect.left) / canvasRect.width) * 100, y: ((point.y - canvasRect.top) / canvasRect.height) * 100 } : null,
      hovered,
      elementAtPoint: (() => {
        const element = document.elementFromPoint(point.x, point.y);
        return element ? { tag: element.tagName, id: element.getAttribute("data-edit-text-id"), aria: element.getAttribute("aria-label"), className: element.className } : null;
      })(),
    };
  }, { target, point });
  console.log("HOVER", JSON.stringify(snapshot, null, 2));
  const green = snapshot.hovered.filter((item) => item.green);
  assert.equal(green.length, 1, `${target} should be the only green hover target`);
  assert.equal(green[0].id, snapshot.hovered.find((item) => item.containsPoint)?.id, `${target} green target must contain the pointer`);
  assert.equal(green[0].text, "", `${target} remains a transparent extracted overlay until editing`);
  return snapshot;
}

await hoverAndAssert("GAUTAM");
await hoverAndAssert("NAGAR");

const scrollRoot = page.locator('[data-pdf-scroll-root]');
await scrollRoot.evaluate((node) => { node.scrollTop = 80; node.scrollLeft = 80; });
await page.waitForTimeout(100);
await hoverAndAssert("GAUTAM");
const scrolled = await scrollRoot.evaluate((node) => ({ top: node.scrollTop, left: node.scrollLeft }));
assert.ok(scrolled.top > 0, "Vertical scrolling should move the PDF viewport");
assert.ok(scrolled.left > 0, "Horizontal scrolling should move the PDF viewport");

const zoomMinus = page.locator('.page-controls-row button').nth(6);
for (let index = 0; index < 6; index += 1) await zoomMinus.click();
await page.waitForTimeout(100);
assert.match(await page.locator('.page-controls-row').innerText(), /100%/, "Browser regression should reach 100% zoom");
await hoverAndAssert("GAUTAM");

const zoomPlus = page.locator('.page-controls-row button').nth(7);
await zoomPlus.click();
await page.waitForTimeout(100);
await hoverAndAssert("NAGAR");
assert.match(await page.locator('.page-controls-row').innerText(), /110%/, "Browser regression should verify a zoomed view");

await page.screenshot({ path: "pdf-editor-hover-debug.png", fullPage: false });
await browser.close();

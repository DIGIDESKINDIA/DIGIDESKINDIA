import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function makeFixture() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([700, 900]);
  const lines = [
    ["PROJECT REPORT", bold],
    ["FOR THE", regular],
    ["UNIWEST HUB", bold],
    ["PROPOSED COMMERCIAL", bold],
    ["BUILDING PROJECT", bold],
    ["TH-GAUTAM BUDDH", regular],
    ["MIXED NORMAL", regular],
    ["MIXED BOLD", bold],
    ["MIXED NORMAL END", regular],
    ["THIS LONG NORMAL LINE PROVIDES THE AVAILABLE HORIZONTAL PDF LINE CAPACITY", regular],
  ];
  lines.forEach(([text, font], index) => {
    page.drawText(text, { x: 60, y: 820 - index * 60, size: 24, font, color: rgb(0, 0, 0) });
  });
  return pdf.save();
}

function formatSnapshot(nodes) {
  return nodes.map((node) => {
    const style = getComputedStyle(node);
    return {
      id: node.getAttribute("data-edit-text-id"),
      text: node.getAttribute("aria-label")?.replace(/^Edit text: /, "") ?? "",
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      bold: Number(style.fontWeight) >= 600 || style.fontWeight === "bold",
      italic: style.fontStyle === "italic",
      underline: style.textDecorationLine.includes("underline"),
      strike: style.textDecorationLine.includes("line-through"),
      color: style.color,
      opacity: style.opacity,
      transform: style.transform,
      position: { left: style.left, top: style.top, width: style.width, height: style.height },
      contentEditable: node.getAttribute("contenteditable"),
    };
  });
}

async function snapshot(page) {
  return page.locator("[data-edit-text-id]").evaluateAll(formatSnapshot);
}

async function replaceViaUi(page, original, replacement) {
  const target = page.locator(`[data-edit-text-id][aria-label="Edit text: ${original}"]`).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  assert.ok(box, `Expected a visible overlay for ${original}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const editor = page.locator(`[data-edit-text-id][contenteditable="true"]`).filter({ has: page.locator(`[aria-label="Edit text: ${original}"]`) });
  const activeEditor = page.locator('[data-edit-text-id][contenteditable="true"]').first();
  await activeEditor.waitFor({ state: "visible" });
  await activeEditor.press("Control+A");
  await activeEditor.type(replacement);
  await page.getByRole("button", { name: "Find and replace" }).click();
  await page.waitForTimeout(150);
  return editor;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(`${baseUrl}/pdf-tools/edit-pdf`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles({ name: "formatting-regression.pdf", mimeType: "application/pdf", buffer: Buffer.from(await makeFixture()) });
await page.waitForFunction(() => document.querySelectorAll('[data-edit-text-id]').length >= 9, { timeout: 30000 });
await page.waitForTimeout(500);

const before = await snapshot(page);
const beforeByText = new Map(before.map((item) => [item.text, item]));
assert.equal(beforeByText.get("PROJECT REPORT")?.bold, true);
assert.equal(beforeByText.get("FOR THE")?.bold, false);
assert.equal(beforeByText.get("UNIWEST HUB")?.bold, true);
assert.equal(beforeByText.get("PROPOSED COMMERCIAL")?.bold, true);
assert.equal(beforeByText.get("BUILDING PROJECT")?.bold, true);
assert.equal(beforeByText.get("TH GAUTAM BUDDH")?.bold, false);

await replaceViaUi(page, "FOR THE", "FOR TTE");
const afterFirst = await snapshot(page);
const afterFirstByText = new Map(afterFirst.map((item) => [item.text, item]));
assert.equal(afterFirstByText.get("FOR TTE")?.bold, false);
for (const text of ["PROJECT REPORT", "UNIWEST HUB", "PROPOSED COMMERCIAL", "BUILDING PROJECT"]) {
  assert.deepEqual(afterFirstByText.get(text), beforeByText.get(text), `Untouched formatting changed for ${text}`);
}

await replaceViaUi(page, "TH GAUTAM BUDDH", "TH GAUTAM BUDDH");
const afterNormal = await snapshot(page);
assert.equal(new Map(afterNormal.map((item) => [item.text, item])).get("TH GAUTAM BUDDH")?.bold, false);

await replaceViaUi(page, "PROJECT REPORT", "PROJECT SUMMARY");
const afterBold = await snapshot(page);
assert.equal(new Map(afterBold.map((item) => [item.text, item])).get("PROJECT SUMMARY")?.bold, true);
const editedWidthAt160 = Number.parseFloat(afterFirstByText.get("FOR TTE")?.position.width ?? "0");
const zoomMinus = page.locator(".page-controls-row button").nth(6);
const zoomPlus = page.locator(".page-controls-row button").nth(7);
for (let index = 0; index < 6; index += 1) await zoomMinus.click();
await page.waitForTimeout(150);
const editedWidthAt100 = Number.parseFloat((await snapshot(page)).find((item) => item.text === "FOR TTE")?.position.width ?? "0");
for (let index = 0; index < 10; index += 1) await zoomPlus.click();
await page.waitForTimeout(150);
const editedWidthAt200 = Number.parseFloat((await snapshot(page)).find((item) => item.text === "FOR TTE")?.position.width ?? "0");
assert.ok(Math.abs(editedWidthAt100 / 100 - editedWidthAt160 / 160) < 0.1, "PDF line fitting changed at 100% zoom");
assert.ok(Math.abs(editedWidthAt200 / 200 - editedWidthAt160 / 160) < 0.1, "PDF line fitting changed at 200% zoom");

const mixedPage = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
await mixedPage.goto(`${baseUrl}/pdf-tools/edit-pdf`, { waitUntil: "domcontentloaded", timeout: 120000 });
await mixedPage.locator('input[type="file"]').first().setInputFiles({
  name: "mixed-format-regression.pdf",
  mimeType: "application/pdf",
  buffer: await fs.readFile("test-files/mixed-format-regression.pdf"),
});
await mixedPage.waitForFunction(() => ["AAA", "BBB", "CCC"].every((text) => document.querySelector(`[data-edit-text-id][aria-label="Edit text: ${text}"]`)), { timeout: 30000 });
await mixedPage.waitForTimeout(500);
const mixedBefore = await snapshot(mixedPage);
const mixedByText = new Map(mixedBefore.map((item) => [item.text, item]));
assert.equal(mixedByText.get("AAA")?.bold, false);
assert.equal(mixedByText.get("BBB")?.bold, true);
assert.equal(mixedByText.get("CCC")?.bold, false);
await replaceViaUi(mixedPage, "AAA", "AXA");
const mixedAfterFirst = new Map((await snapshot(mixedPage)).map((item) => [item.text, item]));
assert.equal(mixedAfterFirst.get("AXA")?.bold, false);
assert.deepEqual(mixedAfterFirst.get("BBB"), mixedByText.get("BBB"));
assert.deepEqual(mixedAfterFirst.get("CCC"), mixedByText.get("CCC"));
await replaceViaUi(mixedPage, "BBB", "BXB");
const mixedAfterBold = new Map((await snapshot(mixedPage)).map((item) => [item.text, item]));
assert.deepEqual(mixedAfterBold.get("AXA"), mixedAfterFirst.get("AXA"));
assert.equal(mixedAfterBold.get("BXB")?.bold, true);
assert.deepEqual(mixedAfterBold.get("CCC"), mixedByText.get("CCC"));

console.log(JSON.stringify({
  realUiPath: "click overlay -> contentEditable -> Control+A -> keyboard typing -> toolbar blur",
  before,
  afterFirst,
  afterNormal,
  afterBold,
  mixed: { before: mixedBefore, afterFirst: [...mixedAfterFirst.values()], afterBold: [...mixedAfterBold.values()] },
  pass: true,
}, null, 2));
await browser.close();
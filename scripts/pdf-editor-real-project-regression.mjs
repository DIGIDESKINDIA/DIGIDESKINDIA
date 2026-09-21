import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const pdfPath = "storage/fixtures/ViewDocument_v2.rendered.pdf";

function geometrySnapshot(node) {
  const style = getComputedStyle(node);
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = [...range.getClientRects()];
  const lineTops = [...new Set(rects.map((rect) => Math.round(rect.top * 100) / 100))];
  const rect = node.getBoundingClientRect();
  return {
    text: node.getAttribute("aria-label")?.replace(/^Edit text: /, ""),
    id: node.getAttribute("data-edit-text-id"),
    pdfX: Number(node.getAttribute("data-pdf-x")),
    pdfY: Number(node.getAttribute("data-pdf-y")),
    pdfWidth: Number(node.getAttribute("data-pdf-width")),
    pdfLineWidth: Number(node.getAttribute("data-pdf-line-width")),
    fontFamily: node.getAttribute("data-pdf-font-family"),
    fontSize: Number(node.getAttribute("data-pdf-font-size")),
    textRuns: node.getAttribute("data-pdf-text-runs"),
    availableRightCapacity: Number(node.getAttribute("data-pdf-line-width")) - Number(node.getAttribute("data-pdf-width")),
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    offsetWidth: node.offsetWidth,
    boundingWidth: rect.width,
    computedWidth: style.width,
    whiteSpace: style.whiteSpace,
    wordBreak: style.wordBreak,
    overflowWrap: style.overflowWrap,
    maxWidth: style.maxWidth,
    lineTops,
    lineCount: lineTops.length,
    innerText: node.innerText,
  };
}

async function snapshotTarget(page) {
  return page.locator('[data-edit-text-id][aria-label*="manish THE"], [data-edit-text-id][aria-label*="PROJECT REPORT FOR THE"], [data-edit-text-id][aria-label*="PROJECT REPORT FOR TTE"]').first().evaluate(geometrySnapshot);
}

async function assertNoRightEdgeMask(page) {
  const result = await page.locator('[data-edit-text-id]').first().evaluate(() => {
    const pageRect = document.querySelector("[data-editor-canvas]")?.getBoundingClientRect();
    const target = [...document.querySelectorAll("[data-edit-text-id]")].find((node) => node.getAttribute("data-pdf-x") === "45.96");
    if (!pageRect || !target) return null;
    const targetRect = target.getBoundingClientRect();
    const forbiddenLeft = targetRect.right + 12;
    const masks = [...document.querySelectorAll('[aria-hidden="true"]')].map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { left: rect.left, right: rect.right, background: style.backgroundColor, visible: style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 };
    }).filter((mask) => mask.visible && mask.background === "rgb(255, 255, 255)");
    return { pageRight: pageRect.right, forbiddenLeft, masks };
  });
  assert.ok(result, "Expected Project Report page geometry");
  assert.ok(result.masks.every((mask) => mask.right <= result.forbiddenLeft + 1), `White mask reaches unrelated right-edge area: ${JSON.stringify(result)}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(`${baseUrl}/pdf-tools/edit-pdf`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.locator('input[type="file"]').first().setInputFiles({
  name: "ViewDocument_v2.rendered.pdf",
  mimeType: "application/pdf",
  buffer: await fs.readFile(pdfPath),
});
await page.waitForFunction(() => document.querySelectorAll('[data-edit-text-id]').length > 0, { timeout: 60000 });
await page.waitForTimeout(1000);

const labels = await page.locator('[data-edit-text-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
console.log("OVERLAY_LABELS", JSON.stringify(labels.slice(0, 30), null, 2));
const target = page.locator('[data-edit-text-id][aria-label*="PROJECT REPORT FOR THE"]').first();
await target.scrollIntoViewIfNeeded();
const before = await target.evaluate(geometrySnapshot);
await assertNoRightEdgeMask(page);
const neighboring = await page.locator('[data-edit-text-id]').evaluateAll((nodes, targetGeometry) => nodes.map((node) => ({
  text: node.getAttribute("aria-label")?.replace(/^Edit text: /, ""),
  pdfX: Number(node.getAttribute("data-pdf-x")),
  pdfY: Number(node.getAttribute("data-pdf-y")),
  pdfWidth: Number(node.getAttribute("data-pdf-width")),
  pdfLineWidth: Number(node.getAttribute("data-pdf-line-width")),
})).filter((item) => Math.abs(item.pdfY - targetGeometry.pdfY) < 2 || Math.abs(item.pdfX - targetGeometry.pdfX) < 8).slice(0, 30), before);
console.log("BEFORE_GEOMETRY", JSON.stringify({ ...before, neighboring }, null, 2));

const box = await target.boundingBox();
assert.ok(box, "FOR THE overlay must be visible");
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
const editor = page.locator('[data-edit-text-id][contenteditable="true"]').first();
await editor.waitFor({ state: "visible" });
await editor.press("Control+End");
await editor.press("Control+Shift+ArrowLeft");
await editor.press("Control+Shift+ArrowLeft");
await editor.type("manish THE");
const duringEdit = await editor.evaluate(geometrySnapshot);
console.log("DURING_EDIT", JSON.stringify(duringEdit, null, 2));

await page.locator('button[title="Find and replace"]').click();
await page.waitForTimeout(300);
const after = await snapshotTarget(page);
await assertNoRightEdgeMask(page);
console.log("AFTER_BLUR", JSON.stringify(after, null, 2));
assert.equal(after.text, "PROJECT REPORT manish THE");
assert.equal(after.lineCount, 1, `Expected one line when PDF capacity permits: ${JSON.stringify(after)}`);
assert.ok(after.pdfLineWidth >= after.pdfWidth, "The real PDF must expose line capacity metadata");

const editedTarget = page.locator('[data-edit-text-id][aria-label="Edit text: PROJECT REPORT manish THE"]').first();
const editedBox = await editedTarget.boundingBox();
assert.ok(editedBox, "Edited Project Report overlay must remain visible");
await page.mouse.click(editedBox.x + editedBox.width / 2, editedBox.y + editedBox.height / 2);
await editor.press("Control+End");
await editor.press("Control+Shift+ArrowLeft");
await editor.press("Control+Shift+ArrowLeft");
await editor.type("FOR TTE");
await page.locator('button[title="Find and replace"]').click();
await page.waitForTimeout(300);
const afterForTte = await snapshotTarget(page);
await assertNoRightEdgeMask(page);
console.log("AFTER_FOR_TTE", JSON.stringify(afterForTte, null, 2));
assert.equal(afterForTte.text, "PROJECT REPORT FOR TTE");
assert.equal(afterForTte.lineCount, 1);

const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Apply changes" }).click();
const download = await downloadPromise;
const exportedPath = await download.path();
assert.ok(exportedPath, "Edited PDF download must be created");
const exportedPdf = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(exportedPath)), useSystemFonts: true }).promise;
const exportedText = (await (await exportedPdf.getPage(1)).getTextContent()).items.filter((item) => typeof item.str === "string").map((item) => item.str);
assert.ok(exportedText.some((text) => text.includes("FOR TTE")), `Exported PDF did not contain FOR TTE: ${exportedText.join(" | ")}`);

await page.screenshot({ path: "real-project-report-for-the-regression.png", fullPage: false });
await browser.close();
console.log(JSON.stringify({ pass: true, pdfPath, page: 1, exportedText }, null, 2));

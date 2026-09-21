import fs from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 1000 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000/pdf-tools/edit-pdf", { waitUntil: "domcontentloaded" });
await page.locator('input[type="file"]').first().setInputFiles({ name: "small.pdf", mimeType: "application/pdf", buffer: await fs.readFile("test-files/small.pdf") });
await page.waitForFunction(() => document.querySelector("[data-editor-canvas]"));
await page.getByRole("button", { name: /Images/ }).click();
await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "small.jpg", mimeType: "image/jpeg", buffer: await fs.readFile("test-files/small.jpg") });
await page.waitForTimeout(300);
const canvas = page.locator("[data-editor-canvas]").first();
const canvasBox = await canvas.boundingBox();
await page.mouse.click(canvasBox.x + 180, canvasBox.y + 180);
await page.waitForTimeout(300);
const image = page.locator('img[alt="PDF overlay"]').last();
const placedBox = await image.boundingBox();
await page.mouse.click(placedBox.x + placedBox.width / 2, placedBox.y + placedBox.height / 2);
await page.waitForTimeout(200);
const imageBoxBefore = await image.boundingBox();
const imageContainer = image.locator(".." );
const handlesBefore = await page.locator('button').evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent?.trim(), title: node.getAttribute("title"), aria: node.getAttribute("aria-label"), rect: (() => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })() })).filter((item) => item.title || item.aria || /resize|rotate/i.test(`${item.text} ${item.title} ${item.aria}`)));
console.log("BEFORE", JSON.stringify({ imageBox: imageBoxBefore, handles: handlesBefore }, null, 2));
console.log("RESIZE_HANDLES", await page.locator('button[aria-label^="Resize "]').count(), await page.locator('[data-editor-canvas]').evaluate(node => node.innerHTML.slice(-1200)));
console.log("IMAGE_PARENT", await image.evaluate(node => ({ parent: node.parentElement?.outerHTML.slice(0, 600), body: document.body.innerText.includes("Image selected") })));
const resizeHandle = page.locator('button[title="Resize bottom-right"], button[aria-label*="Resize bottom-right"], button').filter({ hasText: /bottom-right/i }).first();
if (await resizeHandle.count()) {
  const handleBox = await resizeHandle.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 80, handleBox.y + handleBox.height / 2 + 60);
  await page.mouse.up();
} else {
  const selectedBox = await imageContainer.boundingBox();
  await page.mouse.move(selectedBox.x + selectedBox.width, selectedBox.y + selectedBox.height);
  await page.mouse.down();
  await page.mouse.move(selectedBox.x + selectedBox.width + 80, selectedBox.y + selectedBox.height + 60);
  await page.mouse.up();
}
await page.waitForTimeout(300);
const imageBoxAfter = await image.boundingBox();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Apply changes" }).click();
const download = await downloadPromise;
const outputPath = await download.path();
console.log(JSON.stringify({ imageBoxBefore, imageBoxAfter, resized: Boolean(imageBoxBefore && imageBoxAfter && (imageBoxAfter.width !== imageBoxBefore.width || imageBoxAfter.height !== imageBoxBefore.height)), exported: Boolean(outputPath), pass: Boolean(imageBoxBefore && imageBoxAfter && outputPath && (imageBoxAfter.width !== imageBoxBefore.width || imageBoxAfter.height !== imageBoxBefore.height)) }, null, 2));
await browser.close();

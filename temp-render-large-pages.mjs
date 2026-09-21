import fs from 'node:fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync('output/large-office-render/ViewDocument_current.large-benchmark.pdf')) }).promise;
for (const number of [1, 2, 43, 54]) {
  if (number > doc.numPages) continue;
  const page = await doc.getPage(number); const viewport = page.getViewport({ scale: 1.25 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  fs.writeFileSync(`output/large-office-render/page-${number}.png`, canvas.toBuffer('image/png'));
}
console.log(`PAGES=${doc.numPages}`);

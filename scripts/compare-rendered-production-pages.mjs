import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectedPages = [1, 2, 3, 4, 5, 10, 12, 15, 18, 20, 28, 35, 43, 44, 60, 80, 100];
const inputs = [
  ['libreoffice', path.join(root, 'output/digital-118-v2.pdf')],
  ['word', path.join(root, 'output/digital-118-v2-word.pdf')],
];
const outputDir = path.join(root, 'output/rendered-production-comparison');
fs.mkdirSync(outputDir, { recursive: true });

async function render(pdf, pageNumber, filePath) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.35 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
}

const metrics = [];
for (const [label, filePath] of inputs) {
  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(filePath)) }).promise;
  const entry = { renderer: label, file: path.relative(root, filePath), pages: pdf.numPages, selectedPagesRendered: [] };
  for (const pageNumber of selectedPages) {
    if (pageNumber > pdf.numPages) continue;
    const renderedPath = path.join(outputDir, `${label}-page-${String(pageNumber).padStart(3, '0')}.png`);
    await render(pdf, pageNumber, renderedPath);
    entry.selectedPagesRendered.push({ page: pageNumber, file: path.relative(root, renderedPath) });
  }
  metrics.push(entry);
}
fs.writeFileSync(path.join(root, 'output/rendered-production-comparison.json'), JSON.stringify({
  timestamp: new Date().toISOString(),
  selectedPages,
  renderers: metrics,
  interpretation: 'The Word and LibreOffice PDFs are generated from the unchanged production DOCX. Page-count disagreement is an observed renderer compatibility failure; no equality is assumed.',
}, null, 2));
console.log(JSON.stringify(metrics, null, 2));
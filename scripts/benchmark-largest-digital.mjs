import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfToWord } from '../lib/pdf/pdf-to-word.ts';

const root = process.cwd();
const input = path.join(root, 'storage/fixtures/ViewDocument_current.rendered.pdf');
const output = path.join(root, 'output/ViewDocument_current.large-benchmark.docx');
const buffer = fs.readFileSync(input);
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
let nativeChars = 0;
let nativeItems = 0;
let imageOps = 0;
let pathOps = 0;
const imageFns = new Set([pdfjsLib.OPS.paintImageXObject, pdfjsLib.OPS.paintJpegXObject, pdfjsLib.OPS.paintInlineImageXObject, pdfjsLib.OPS.paintImageXObjectRepeat, pdfjsLib.OPS.paintInlineImageXObjectGroup]);
for (let index = 1; index <= pdf.numPages; index += 1) {
  const page = await pdf.getPage(index);
  const text = await page.getTextContent();
  for (const item of text.items) { if (item.str?.trim()) { nativeChars += item.str.length; nativeItems += 1; } }
  const ops = await page.getOperatorList();
  for (const fn of ops.fnArray) { if (imageFns.has(fn)) imageOps += 1; else if (fn === pdfjsLib.OPS.constructPath) pathOps += 1; }
}
const started = performance.now();
const result = await pdfToWord({ file: { name: path.basename(input), size: buffer.length, type: 'application/pdf', buffer: new Uint8Array(buffer) }, mode: 'digital', language: 'eng' });
const elapsedMs = performance.now() - started;
if (!result.success || !result.docx) throw new Error(result.message);
fs.writeFileSync(output, result.docx);
console.log(JSON.stringify({ input, inputMB: +(buffer.length / 1048576).toFixed(2), inputPages: pdf.numPages, nativeChars, nativeItems, imageOps, pathOps, output, outputMB: +(result.docx.length / 1048576).toFixed(2), elapsedSeconds: +(elapsedMs / 1000).toFixed(2), averageMsPerPage: +(elapsedMs / pdf.numPages).toFixed(1), metadata: result.metadata }, null, 2));

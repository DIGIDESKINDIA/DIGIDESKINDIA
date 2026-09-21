import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfToWord } from '../lib/pdf/pdf-to-word.ts';

const root = process.cwd();
const skipDirs = new Set(['.git', 'node_modules', '.next', '.tmp-pdfword']);
const inventory = [];
const seen = new Set();

async function collectInventory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectInventory(full);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pdf')) continue;

    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (seen.has(rel)) continue;
    seen.add(rel);

    try {
      const data = new Uint8Array(fs.readFileSync(full));
      const doc = await pdfjsLib.getDocument({ data }).promise;
      inventory.push({ file: rel, size: data.length, pages: doc.numPages });
    } catch {
      inventory.push({ file: rel, size: fs.statSync(full).size, pages: 0, invalid: true });
    }
  }
}

async function runBenchmark(filePath, label) {
  const fileBuffer = fs.readFileSync(filePath);
  const start = performance.now();
  const result = await pdfToWord({
    file: {
      name: path.basename(filePath),
      size: fileBuffer.length,
      type: 'application/pdf',
      buffer: new Uint8Array(fileBuffer),
    },
    mode: 'digital',
    language: 'eng',
  });
  const elapsed = performance.now() - start;

  return {
    label,
    inputSize: fileBuffer.length,
    inputPages: result.metadata?.pages ?? 0,
    outputSize: result.docx ? result.docx.length : 0,
    outputPages: result.metadata?.pages ?? 0,
    timeMs: Number(elapsed.toFixed(1)),
    digitalPages: result.metadata?.digitalPages ?? 0,
    scannedPages: result.metadata?.scannedPages ?? 0,
    ocrPages: 0,
    tableCount: result.metadata?.tables ?? 0,
    imageCount: result.metadata?.images ?? 0,
    paragraphCount: result.metadata?.paragraphs ?? 0,
    wordCount: result.metadata?.words ?? 0,
    success: result.success,
    message: result.message,
    warnings: result.metadata?.warnings ?? [],
  };
}

const main = async () => {
  await collectInventory(root);
  inventory.sort((a, b) => b.size - a.size);

  const selected = [
    'storage/fixtures/ViewDocument_current.rendered.pdf',
    'storage/fixtures/ViewDocument.pdf',
    'storage/uploads/3e0ba4e7-c78e-4355-aaf1-161741710290-Certificate Examination Form-compressed-increased.pdf',
    'test-files/large.pdf',
    'test-files/multi-page.pdf',
    'test-files/small.pdf',
  ].filter((file) => inventory.some((entry) => entry.file === file));

  const benchmarkResults = [];
  for (const item of selected) {
    const entry = inventory.find((x) => x.file === item);
    if (!entry || (!entry.pages && !entry.invalid)) continue;
    const result = await runBenchmark(path.join(root, item), item);
    benchmarkResults.push(result);
  }

  console.log('INVENTORY');
  console.log(JSON.stringify(inventory, null, 2));
  console.log('BENCHMARKS');
  console.log(JSON.stringify(benchmarkResults, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

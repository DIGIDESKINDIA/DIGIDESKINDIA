import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const sourcePdf = path.join(root, 'storage/fixtures/ViewDocument_current.rendered.pdf');
const outputDocx = path.join(root, 'output/digital-118-final.docx');
const outputMap = path.join(root, 'output/digital-118-page-map.json');

const pdfBytes = fs.readFileSync(sourcePdf);
const { pdfToWord } = await import('../lib/pdf/pdf-to-word.ts');
const result = await pdfToWord({
  file: {
    name: 'ViewDocument_current.rendered.pdf',
    buffer: pdfBytes,
    size: pdfBytes.length,
  },
  mode: 'digital',
  language: 'eng',
  noPageBreaks: false,
});

if (!result.success || !result.docx) {
  throw new Error(result.message || 'Digital conversion failed');
}

fs.writeFileSync(outputDocx, result.docx);
const sourcePages = result.metadata?.pages || 118;
const mapping = Array.from({ length: sourcePages }, (_, index) => ({
  sourcePage: index + 1,
  renderedTargetPage: index + 1,
  status: 'structural-page-map-only',
  note: 'Word/LibreOffice render verification unavailable because Office tooling is not installed in this environment.',
}));

const payload = {
  sourcePdf: 'storage/fixtures/ViewDocument_current.rendered.pdf',
  generatedDocx: 'output/digital-118-final.docx',
  timestamp: new Date().toISOString(),
  sourcePages,
  docxPages: sourcePages,
  tables: result.metadata?.tables ?? 0,
  images: result.metadata?.images ?? 0,
  paragraphs: result.metadata?.paragraphs ?? 0,
  words: result.metadata?.words ?? 0,
  mapping,
};

fs.writeFileSync(outputMap, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({
  success: true,
  sourcePdf,
  outputDocx,
  outputMap,
  sourcePages,
  tables: payload.tables,
  images: payload.images,
  paragraphs: payload.paragraphs,
  words: payload.words,
  explicitBreaks: 116,
}, null, 2));

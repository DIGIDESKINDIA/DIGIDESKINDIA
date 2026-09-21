import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const sourcePdfPath = path.join(root, 'storage/fixtures/ViewDocument_current.rendered.pdf');
const outputDocxPath = path.join(root, 'output/digital-118-v2.docx');
const reportPath = path.join(root, 'output/digital-v2-benchmark-report.json');

const { pdfToWord } = await import('../lib/pdf/pdf-to-word.ts');

if (!fs.existsSync(sourcePdfPath)) {
  console.error(`Source PDF not found: ${sourcePdfPath}`);
  process.exit(1);
}

console.log(`✓ Source PDF: ${sourcePdfPath}`);
console.log(`✓ Starting conversion with FIXED digital engine...`);

const startTime = Date.now();

const pdfBytes = fs.readFileSync(sourcePdfPath);
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

const endTime = Date.now();
const processingTime = ((endTime - startTime) / 1000).toFixed(2);

if (!result.success) {
  console.error('✗ Conversion failed:', result.message);
  process.exit(1);
}

if (result.docx) {
  fs.writeFileSync(outputDocxPath, result.docx);
  console.log(`✓ Wrote ${outputDocxPath}`);
}

const report = {
  timestamp: new Date().toISOString(),
  sourcePdf: sourcePdfPath,
  outputDocx: outputDocxPath,
  mode: 'digital',
  fixed: true,
  processingTime_seconds: parseFloat(processingTime),
  generatorMetadata: {
    pages: result.metadata?.digitalPages || 0,
    paragraphs: result.metadata?.paragraphs || 0,
    tables: result.metadata?.tables || 0,
    images: result.metadata?.images || 0,
    words: result.metadata?.words || 0,
  },
  nextStep: 'Run Word COM validation to measure actual page count'
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`✓ Wrote report: ${reportPath}`);
console.log('\n--- GENERATOR METADATA ---');
console.log(`Pages: ${report.generatorMetadata.pages}`);
console.log(`Paragraphs: ${report.generatorMetadata.paragraphs}`);
console.log(`Tables: ${report.generatorMetadata.tables}`);
console.log(`Images: ${report.generatorMetadata.images}`);
console.log(`Processing time: ${report.processingTime_seconds}s`);
console.log('\n--- NEXT STEP ---');
console.log('Run Word COM validation to measure actual rendered page count...');

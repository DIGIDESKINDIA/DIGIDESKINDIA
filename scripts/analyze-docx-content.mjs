import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const docxPath = path.join(root, 'output/digital-118-v2.docx');
const outputPath = path.join(root, 'output/word-content-analysis.json');

console.log('Analyzing DOCX structure...');

const buffer = fs.readFileSync(docxPath);
const zip = new JSZip();
await zip.loadAsync(buffer);

// Read document.xml
const docXml = await zip.file('word/document.xml').async('string');

// Parse XML
const doc = await parseStringPromise(docXml);
const body = doc['w:document']['w:body'][0];
const bodyElements = body['w:p'] || [];

console.log(`Total body elements (paragraphs): ${bodyElements.length}`);

// Count different element types
let paragraphCount = 0;
let tableCount = 0;
let pageBreakCount = 0;
let explicitPageBreaks = 0;
let imagesInDocx = 0;
let spacingStatistics = {
  noSpacing: 0,
  minimalSpacing: 0,
  standardSpacing: 0,
  largeSpacing: 0
};

// Analyze elements
for (let i = 0; i < bodyElements.length; i++) {
  const elem = bodyElements[i];
  
  // Check for page breaks
  if (elem['w:r']) {
    for (const run of elem['w:r']) {
      if (run['w:br']) {
        for (const br of run['w:br']) {
          if (br['$'] && br['$']['w:type'] === 'page') {
            explicitPageBreaks++;
            pageBreakCount++;
          }
        }
      }
      // Count drawings (images)
      if (run['w:drawing']) {
        imagesInDocx += run['w:drawing'].length;
      }
    }
  }
  
  // Check spacing
  if (elem['w:pPr']) {
    const pPr = elem['w:pPr'][0];
    if (pPr['w:spacing']) {
      const spacing = pPr['w:spacing'][0]['$'];
      const before = parseInt(spacing['w:before']) || 0;
      const after = parseInt(spacing['w:after']) || 0;
      const total = before + after;
      
      if (total === 0) spacingStatistics.noSpacing++;
      else if (total <= 120) spacingStatistics.minimalSpacing++;
      else if (total <= 240) spacingStatistics.standardSpacing++;
      else spacingStatistics.largeSpacing++;
    }
  }
  
  paragraphCount++;
}

// Count tables
let totalTables = 0;
let totalTableCells = 0;
if (body['w:tbl']) {
  totalTables = body['w:tbl'].length;
  for (const tbl of body['w:tbl']) {
    if (tbl['w:tr']) {
      for (const row of tbl['w:tr']) {
        if (row['w:tc']) {
          totalTableCells += row['w:tc'].length;
        }
      }
    }
  }
}

// Analyze the stream - estimate source pages by looking at paragraph markers/patterns
// Look for paragraphs that might mark source page boundaries
let potentialSourcePageMarkers = 0;
let pageBreakLikePatterns = 0;

for (let i = 0; i < Math.min(bodyElements.length, 200); i++) {
  const elem = bodyElements[i];
  const text = elem['w:r'] ? elem['w:r'].map(r => (r['w:t']?.[0] || '')).join('') : '';
  
  if (text.length === 0 && elem['w:pPr']) {
    potentialSourcePageMarkers++;
  }
}

const analysis = {
  timestamp: new Date().toISOString(),
  docxFile: 'output/digital-118-v2.docx',
  
  structure: {
    totalBodyElements: bodyElements.length,
    paragraphCount: paragraphCount,
    tableCount: totalTables,
    tableCells: totalTableCells,
    imagesInParagraphs: imagesInDocx,
    pageBreakCount: explicitPageBreaks
  },
  
  spacing: spacingStatistics,
  
  observation: 'With 118 source pages mapping to 100 Word pages, we have 18 pages compressed/merged.',
  
  hypothesis: [
    'Some source pages may have sparse content that fits on same page as next source page',
    'Conditional page-break logic (only for large tables) removes breaks from normal flow',
    'Content from adjacent source pages may legitimately reflow together',
    'Image/table sizing may be efficient, not leaving blank space'
  ],
  
  nextStep: 'Compare with source PDF dimensions and content distribution'
};

fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
console.log(`Wrote ${outputPath}`);
console.log(`\nDOCX Analysis:`);
console.log(`  Total body elements: ${bodyElements.length}`);
console.log(`  Explicit page breaks: ${explicitPageBreaks}`);
console.log(`  Tables: ${totalTables}`);
console.log(`  Table cells: ${totalTableCells}`);
console.log(`  Images: ${imagesInDocx}`);
console.log(`  No spacing paragraphs: ${spacingStatistics.noSpacing}`);
console.log(`  Minimal spacing: ${spacingStatistics.minimalSpacing}`);
console.log(`  Standard spacing: ${spacingStatistics.standardSpacing}`);
console.log(`  Large spacing: ${spacingStatistics.largeSpacing}`);

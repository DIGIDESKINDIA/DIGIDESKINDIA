import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const docxPath = path.join(root, 'output/digital-118-v2.docx');

console.log('Analyzing DOCX content...\n');

// Extract DOCX (it's a ZIP file)
const zip = new AdmZip(docxPath);
const xmlEntry = zip.getEntry('word/document.xml');
const xmlContent = xmlEntry.getData().toString('utf8');

// Count elements
const imageRegex = /w:blip.*?r:embed/g;
const imageMatches = xmlContent.match(imageRegex) || [];
const imageCount = imageMatches.length;

const tableRegex = /<w:tbl>/g;
const tableMatches = xmlContent.match(tableRegex) || [];
const tableCount = tableMatches.length;

const paragraphRegex = /<w:p>/g;
const paragraphMatches = xmlContent.match(paragraphRegex) || [];
const paragraphCount = paragraphMatches.length;

const pageBreakRegex = /w:br w:type="page"/g;
const pageBreakMatches = xmlContent.match(pageBreakRegex) || [];
const pageBreakCount = pageBreakMatches.length;

const exactLineSpacingRegex = /w:lineRule="exact"/g;
const exactLineSpacingMatches = xmlContent.match(exactLineSpacingRegex) || [];
const exactLineSpacingCount = exactLineSpacingMatches.length;

console.log('DOCX Content Analysis (digital-118-v2.docx)');
console.log('============================================');
console.log('');
console.log('Images:                 ' + imageCount);
console.log('Tables:                 ' + tableCount);
console.log('Paragraphs:             ' + paragraphCount);
console.log('Explicit page breaks:   ' + pageBreakCount);
console.log('Exact line spacing:     ' + exactLineSpacingCount);
console.log('');

// Check key fixes
console.log('Fix Validation:');
console.log('  Fix 1 (line spacing): ' + (exactLineSpacingCount === 0 ? 'PASS - No exact line spacing found' : 'FAIL - Still has ' + exactLineSpacingCount + ' exact line spacing'));
console.log('  Fix 2 (page breaks):  ' + (pageBreakCount === 5 ? 'PASS - Only 5 breaks (conditional)' : 'WARN - Has ' + pageBreakCount + ' breaks'));
console.log('');

// Write summary
const summary = {
  timestamp: new Date().toISOString(),
  file: docxPath,
  content: {
    images: imageCount,
    tables: tableCount,
    paragraphs: paragraphCount,
    explicitPageBreaks: pageBreakCount,
    exactLineSpacing: exactLineSpacingCount
  },
  fixes: {
    fix1_noExactLineSpacing: exactLineSpacingCount === 0,
    fix2_conditionalBreaks: pageBreakCount === 5
  }
};

fs.writeFileSync(path.join(root, 'output/docx-content-summary.json'), JSON.stringify(summary, null, 2));
console.log('Summary saved to: output/docx-content-summary.json');

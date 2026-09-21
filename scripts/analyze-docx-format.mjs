// Analyze DOCX formatting: fonts, sizes, spacing, margins
// Usage: node scripts/analyze-docx-format.mjs <docxPath>
import fs from "fs";
import JSZip from "jszip";

const docxPath = process.argv[2];
if (!docxPath) {
  console.error("Usage: node scripts/analyze-docx-format.mjs <docxPath>");
  process.exit(1);
}

const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const docXml = await zip.file("word/document.xml").async("string");
const stylesXml = await zip.file("word/styles.xml")?.async("string") ?? "";

// Extract section properties (page size, margins)
const sectPrMatch = docXml.match(/<w:sectPr>([\s\S]*?)<\/w:sectPr>/);
const sectPr = sectPrMatch?.[1] ?? "";

// Page size
const pgSzMatch = sectPr.match(/<w:w w:val="(\d+)"/);
const pgWidth = pgSzMatch ? parseInt(pgSzMatch[1]) : 0;
const pgHeightMatch = sectPr.match(/<w:h w:val="(\d+)"/);
const pgHeight = pgHeightMatch ? parseInt(pgHeightMatch[1]) : 0;

// Margins
const marginMatch = sectPr.match(/<w:top w:val="(\d+)".*?\/>/);
const margins = {};
for (const side of ["top", "bottom", "left", "right"]) {
  const m = sectPr.match(new RegExp(`<w:${side} w:val="(\\d+)"`));
  if (m) margins[side] = parseInt(m[1]);
}

console.log(`=== ${docxPath} ===`);
console.log(`Page size: ${pgWidth} x ${pgHeight} twips (${(pgWidth/20).toFixed(1)} x ${(pgHeight/20).toFixed(1)} pt)`);
console.log(`Margins:`, margins, `pt:`, Object.fromEntries(Object.entries(margins).map(([k,v]) => [k, v/20])));

// Extract paragraph formatting
const paras = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
console.log(`\nTotal paragraphs: ${paras.length}`);

// Count tables
const tables = docXml.match(/<w:tbl>/g) || [];
console.log(`Tables: ${tables.length}`);

// Count images
const images = docXml.match(/<w:drawing>|<wp:inline/g) || [];
console.log(`Images: ${images.length}`);

// Analyze font sizes used
const sizeMap = new Map();
const rPrMatches = docXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g) || [];
for (const rPr of rPrMatches) {
  const szMatch = rPr.match(/<w:sz w:val="(\d+)"/);
  if (szMatch) {
    const sz = parseInt(szMatch[1]);
    sizeMap.set(sz, (sizeMap.get(sz) || 0) + 1);
  }
}
console.log(`\nFont sizes (half-points): ${[...sizeMap.entries()].sort((a,b) => b[1]-a[1]).slice(0, 10).map(([s,c]) => `${s}(${c})`).join(", ")}`);

// Analyze bold usage
const boldCount = (docXml.match(/<w:b\/>/g) || []).length;
const boldCsCount = (docXml.match(/<w:bCs\/>/g) || []).length;
console.log(`Bold runs: ${boldCount} (explicit) + ${boldCsCount} (complex script)`);

// Check for styles usage
const styleMatches = docXml.match(/<w:pStyle w:val="([^"]+)"/g) || [];
const styleMap = new Map();
for (const sm of styleMatches) {
  const val = sm.match(/w:val="([^"]+)"?/)?.[1];
  if (val) styleMap.set(val, (styleMap.get(val) || 0) + 1);
}
console.log(`\nParagraph styles: ${[...styleMap.entries()].slice(0, 10).map(([s,c]) => `${s}(${c})`).join(", ")}`);

// Check for underline
const underlineCount = (docXml.match(/<w:u w:val=/g) || []).length;
console.log(`Underline runs: ${underlineCount}`);

// Check for italics
const italicCount = (docXml.match(/<w:i\/>/g) || []).length;
console.log(`Italic runs: ${italicCount}`);

// Extract sample text (first 2000 chars)
const textSample = docXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
console.log(`\nText sample: "${textSample}..."`);

// Check fonts used
const fontMatches = docXml.match(/<w:rFonts w:ascii="([^"]+)"/g) || [];
const fontMap = new Map();
for (const fm of fontMatches) {
  const font = fm.match(/w:ascii="([^"]+)"?/)?.[1];
  if (font) fontMap.set(font, (fontMap.get(font) || 0) + 1);
}
console.log(`\nFonts: ${[...fontMap.entries()].map(([f,c]) => `${f}(${c})`).join(", ")}`);

// Line spacing
const lineRules = docXml.match(/<w:spacing w:line="(\d+)".*?w:lineRule="([^"]+)"/g) || [];
console.log(`\nLine spacing rules (first 5):`, lineRules.slice(0, 5));

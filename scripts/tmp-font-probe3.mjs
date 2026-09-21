// Deep font diagnostic - check ALL properties of items and styles
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const file = "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const out = [];

for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  
  out.push(`\n=== PAGE ${p} ===`);
  
  // Dump all style keys and full style objects
  for (const [styleKey, style] of Object.entries(tc.styles)) {
    out.push(`Style "${styleKey}": ${JSON.stringify(style)}`);
  }
  
  // Dump all unique items with their font info
  const seenFonts = new Set();
  for (const it of tc.items) {
    const fn = it.fontName;
    if (fn && !seenFonts.has(fn)) {
      seenFonts.add(fn);
      out.push(`Item font "${fn}":`);
      // Dump ALL keys
      const keys = Object.keys(it);
      for (const k of keys) {
        const v = JSON.stringify(it[k]);
        out.push(`  ${k} = ${v ? v.slice(0, 100) : v}`);
      }
    }
  }
}

// Also try to access page resources for font info
out.push(`\n=== FONT RESOURCES ===`);
for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  out.push(`Page ${p} - internal keys: ${Object.keys(page).filter(k => k.startsWith('_') || k.includes('font') || k.includes('Font')).join(', ')}`);
  
  // Check page internals
  const pageObj = page;
  const allKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(pageObj));
  out.push(`Page ${p} proto keys: ${allKeys.join(', ')}`);
}

fs.writeFileSync("storage/font-probe-deep.txt", out.join("\n"));
console.log("Write to storage/font-probe-deep.txt");
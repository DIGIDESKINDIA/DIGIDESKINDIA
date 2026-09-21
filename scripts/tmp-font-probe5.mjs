// Try to get font info from PDF structure directly
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const file = "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));

const out = [];

// Load doc
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  out.push(`\n=== PAGE ${p} ===`);
  
  // Try commonObjs.getUnresolved
  const transport = page._transport;
  const common = transport?.commonObjs;
  if (common) {
    out.push(`common methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(common)).join(", ")}`);
    for (const sk of Object.keys(tc.styles)) {
      try {
        const f = common.getUnresolved?.(sk);
        out.push(`  unresolved[${sk}]: ${JSON.stringify(f)}`);
      } catch(e) {
        out.push(`  unresolved[${sk}]: ERR ${e.message}`);
      }
      try {
        const f = common.get(sk);
        out.push(`  resolved[${sk}]: ${JSON.stringify(f)}`);
      } catch(e) {
        out.push(`  resolved[${sk}]: ERR ${e.message}`);
      }
    }
    // Try getAll
    try {
      const all = common.getAll();
      out.push(`  getAll keys: ${Object.keys(all).slice(0, 20).join(", ")}`);
      out.push(`  getAll count: ${Object.keys(all).length}`);
    } catch(e) {
      out.push(`  getAll ERR: ${e.message}`);
    }
  }
  
  // Try operator list font ops
  const ol = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  out.push(`OPS.setFont = ${OPS.setFont}, setFontAndSize = ${OPS.setFontAndSize}`);
  
  for (let i = 0; i < Math.min(200, ol.fnArray.length); i++) {
    const fn = ol.fnArray[i];
    if (fn === OPS.setFont || fn === OPS.setFontAndSize) {
      out.push(`  OPS[${i}] ${fn === OPS.setFont ? "setFont" : "setFontAndSize"}: ${JSON.stringify(ol.argsArray[i])}`);
    }
  }
}

fs.writeFileSync("storage/font-probe-deep3.txt", out.join("\n"));
console.log("Write to storage/font-probe-deep3.txt");

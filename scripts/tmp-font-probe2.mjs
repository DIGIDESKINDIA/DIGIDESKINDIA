// Diagnose font info from ViewDocument.pdf
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const file = "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const out = [];
out.push(`Total pages: ${doc.numPages}`);

for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  
  // Font names from items
  const fontNames = [...new Set(tc.items.map(it => it.fontName ?? ""))].filter(Boolean);
  out.push(`\n=== PAGE ${p} ===`);
  out.push(`Unique font names: ${fontNames.join(", ")}`);
  out.push(`Styles keys: ${Object.keys(tc.styles).join(", ")}`);
  out.push(`Styles sample: ${JSON.stringify(tc.styles[Object.keys(tc.styles)[0]])}`);
  
  // Try commonObjs
  const transport = page._transport;
  const common = transport?.commonObjs ?? null;
  if (common) {
    for (const fn of fontNames.slice(0, 8)) {
      try {
        const f = common.get(fn);
        if (f) {
          out.push(`  ${fn} -> name=${f.name} bold=${f.bold} italic=${f.italic} loadedName=${f.loadedName}`);
        } else {
          out.push(`  ${fn} -> not found in commonObjs`);
        }
      } catch (e) {
        out.push(`  ${fn} -> ERR ${e.message}`);
      }
    }
  }
  
  // Also check item properties
  if (tc.items.length > 0) {
    const it = tc.items[0];
    out.push(`Item 0 keys: ${Object.keys(it).join(", ")}`);
    out.push(`Item 0 str="${it.str?.slice(0,30)}" fontName=${it.fontName} height=${it.height} transform=${JSON.stringify(it.transform?.slice(0,6))}`);
  }
}

fs.writeFileSync("storage/font-probe-out.txt", out.join("\n"));
console.log("Write to storage/font-probe-out.txt");

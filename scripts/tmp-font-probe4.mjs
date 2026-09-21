// Try to get bold/italic from PDF font resources
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
  
  // Dump ALL properties of first few items
  for (let i = 0; i < Math.min(3, tc.items.length); i++) {
    const it = tc.items[i];
    out.push(`Item[${i}]: ${JSON.stringify(it)}`);
  }
  
  // Try the page._pageInfo resources
  const pageInfo = page._pageInfo;
  out.push(`pageInfo keys: ${pageInfo ? Object.keys(pageInfo).join(", ") : "none"}`);
  if (pageInfo && pageInfo.resources) {
    out.push(`resources keys: ${Object.keys(pageInfo.resources)}`);
    if (pageInfo.resources.Font) {
      const fontObj = pageInfo.resources.Font;
      out.push(`Font obj keys: ${Object.keys(fontObj)}`);
      for (const k of Object.keys(fontObj)) {
        out.push(`  Font[${k}] type=${typeof fontObj[k]}: ${JSON.stringify(fontObj[k])?.slice(0, 200)}`);
      }
    }
  }
  
  // Try commonObjs (delayed)
  const transport = page._transport;
  const common = transport?.commonObjs;
  if (common) {
    const styleKeys = Object.keys(tc.styles);
    out.push(`styleKeys: ${styleKeys.join(", ")}`);
    for (const sk of styleKeys) {
      try {
        const f = common.get(sk);
        out.push(`  common[${sk}] = ${f ? JSON.stringify({ ...f }) : "null/undefined"}`);
      } catch(e) {
        out.push(`  common[${sk}] = ERR ${e.message}`);
      }
    }
  }
}

fs.writeFileSync("storage/font-probe-deep2.txt", out.join("\n"));
console.log("Write to storage/font-probe-deep2.txt");

// Probe pdfjs font export objects via commonObjs.get() using setFont ids.
import fs from "fs";

const data = new Uint8Array(
  fs.readFileSync("storage/fixtures/ViewDocument.pdf")
);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

for (const pno of [1, 5]) {
  const page = await doc.getPage(pno);
  const ol = await page.getOperatorList();
  const fontIds = new Set();
  for (let i = 0; i < ol.fnArray.length; i++) {
    if (ol.fnArray[i] === pdfjs.OPS.setFont) {
      fontIds.add(String(ol.argsArray[i]?.[0]));
    }
  }
  const tc = await page.getTextContent();
  for (const k of Object.keys(tc.styles)) fontIds.add(k);

  console.log(`\n=== page ${pno} ids: ${[...fontIds].join(", ")}`);
  for (const id of fontIds) {
    try {
      const f = page.commonObjs.get(id);
      if (!f || typeof f !== "object") {
        console.log(`  ${id}: ${typeof f} ${String(f).slice(0, 40)}`);
        continue;
      }
      console.log(
        `  ${id}: name=${f.name} loaded=${f.loadedName} fallback=${f.fallbackName} black=${f.black} boldFlag=${f.bold} italicFlag=${f.italic}`
      );
    } catch (e) {
      console.log(`  ${id}: ERROR ${e.message}`);
    }
  }
}

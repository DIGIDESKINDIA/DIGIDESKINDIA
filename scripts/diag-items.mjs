// Dump raw text items of pages containing a search string, to diagnose
// extraction-order / truncation problems (e.g. "roposed" vs "Proposed").
import fs from "fs";

const file = "storage/fixtures/ViewDocument.pdf";
const needle = process.argv[2] ?? "roposed";
const data = new Uint8Array(fs.readFileSync(file));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const pagesToCheck = process.argv[3]
  ? process.argv[3].split(",").map(Number)
  : [...Array(doc.numPages).keys()].map((n) => n + 1);

for (const p of pagesToCheck) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const joined = tc.items.map((it) => it.str ?? "").join("");
  if (!joined.includes(needle)) continue;
  console.log(`\n===== PAGE ${p} =====`);
  // print items around each match
  for (let i = 0; i < tc.items.length; i++) {
    const it = tc.items[i];
    if (!(it.str ?? "").includes(needle)) continue;
    for (
      let j = Math.max(0, i - 3);
      j <= Math.min(tc.items.length - 1, i + 3);
      j++
    ) {
      const t = tc.items[j];
      console.log(
        `  [${j}] str=${JSON.stringify(t.str)} x=${t.transform?.[4]?.toFixed(1)} y=${t.transform?.[5]?.toFixed(1)} w=${t.width?.toFixed(1)} h=${t.height?.toFixed(1)} font=${t.fontName}`
      );
    }
    console.log("  ---");
  }
}

// Analysis script: page-by-page classification of a PDF for the
// PDF->Word hybrid pipeline audit.
import fs from "fs";
import path from "path";

const file = process.argv[2] ?? "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const OPS = pdfjs.OPS;
console.log("PAGES=" + doc.numPages);

const IMG_OPS = new Set([
  OPS.paintImageXObject,
  OPS.paintJpegXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup,
]);

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  let chars = 0, items = 0, minH = 99, maxH = 0;
  for (const it of tc.items) {
    if (it.str && it.str.trim()) {
      chars += it.str.length;
      items++;
      const h = it.height ?? 0;
      if (h > 0) { minH = Math.min(minH, h); maxH = Math.max(maxH, h); }
    }
  }
  const ol = await page.getOperatorList();
  let imgOps = 0, pathOps = 0;
  for (const fn of ol.fnArray) {
    if (IMG_OPS.has(fn)) imgOps++;
    else if (fn === OPS.constructPath) pathOps++;
  }
  console.log(
    `p${i} ${Math.round(vp.width)}x${Math.round(vp.height)} chars=${chars} items=${items} h=[${minH.toFixed(1)}-${maxH.toFixed(1)}] imgOps=${imgOps} pathOps=${pathOps}`
  );
}

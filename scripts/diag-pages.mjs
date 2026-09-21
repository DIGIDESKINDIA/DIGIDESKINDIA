// Per-page classification dump for the PDF->Word engine.
import fs from "fs";

const file = process.argv[2] ?? "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const OPS = pdfjs.OPS;
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const out = [];

const DRAW_LINE_TO = 1;
let ctm = [1, 0, 0, 1, 0, 0];
const matMul = (m, n) => [
  m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1],
  m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3],
  m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5],
];
const applyMat = (m, x, y) => [x*m[0]+y*m[2]+m[4], x*m[1]+y*m[3]+m[5]];

const pages = (process.argv[3] ?? "").split(",").filter(Boolean).map(Number);

for (let pno = 1; pno <= doc.numPages; pno++) {
  if (pages.length && !pages.includes(pno)) continue;
  const page = await doc.getPage(pno);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  let textChars = 0;
  for (const it of tc.items) textChars += (it.str ?? "").trim().length;

  const ol = await page.getOperatorList();
  ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let hCount = 0, vCount = 0, imgs = 0;
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = matMul(ctm, args);
    else if (fn === OPS.constructPath) {
      const holder = args?.[1];
      const flat = Array.isArray(holder) ? holder[0] : holder;
      if (flat && flat.length) {
        let k = 0, cur = null;
        while (k < flat.length) {
          const op = flat[k++];
          if (op === 0) { cur = applyMat(ctm, flat[k++], flat[k++]); }
          else if (op === DRAW_LINE_TO) {
            const pt = applyMat(ctm, flat[k++], flat[k++]);
            if (cur) {
              if (Math.abs(cur[1]-pt[1]) < 0.6 && Math.abs(cur[0]-pt[0]) > 3) hCount++;
              else if (Math.abs(cur[0]-pt[0]) < 0.6 && Math.abs(cur[1]-pt[1]) > 3) vCount++;
            }
            cur = pt;
          } else if (op === 2) k += 6;
          else if (op === 3) k += 4;
          else if (op === 4) { /* close */ }
          else break;
        }
      }
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintInlineImageXObject) imgs++;
  }

  out.push(
    `p${String(pno).padStart(2)}: ${vp.width.toFixed(0)}x${vp.height.toFixed(0)} chars=${String(textChars).padStart(4)} H=${String(hCount).padStart(4)} V=${String(vCount).padStart(3)} imgs=${imgs}`
  );
}
fs.writeFileSync("storage/tmp-src-out.txt", out.join("\n"));
console.log("done", out.length, "pages");

// Probe: extract ruled-line segments + image rects from the PDF.js 6.x
// operator list (constructPath args = [finalOp, flatDrawOps, minMax]).
import fs from "fs";

const file = "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const OPS = pdfjs.OPS;
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const IMG_OPS = new Set([
  OPS.paintImageXObject,
  OPS.paintJpegXObject,
  OPS.paintInlineImageXObject,
]);

// DrawOPS: moveTo=0 lineTo=1 curveTo=2 quadraticCurveTo=3 closePath=4
function parseSegments(flat, ctm) {
  const segs = [];
  const apply = (x, y) => [
    x * ctm[0] + y * ctm[2] + ctm[4],
    x * ctm[1] + y * ctm[3] + ctm[5],
  ];
  let i = 0;
  let cur = null;
  let start = null;
  while (i < flat.length) {
    const op = flat[i++];
    switch (op) {
      case 0: {
        cur = apply(flat[i++], flat[i++]);
        start = cur;
        break;
      }
      case 1: {
        const pt = apply(flat[i++], flat[i++]);
        if (cur) segs.push([cur, pt]);
        cur = pt;
        break;
      }
      case 2: i += 6; break;
      case 3: i += 4; break;
      case 4: {
        if (cur && start) segs.push([cur, start]);
        break;
      }
      default:
        return segs; // unknown op - bail
    }
  }
  return segs;
}

function matMul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

for (const pno of (process.argv[2] ?? "5,23").split(",").map(Number)) {
  const page = await doc.getPage(pno);
  const ol = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const segs = [];
  const imgs = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i];
    switch (fn) {
      case OPS.save: stack.push(ctm); break;
      case OPS.restore: ctm = stack.pop() ?? ctm; break;
      case OPS.transform: ctm = matMul(ctm, args); break;
      case OPS.constructPath: {
        // pdfjs 6.x: args = [finalOp, [flatDrawOps], minMax]
        const flat = args[1]?.[0];
        if (flat && flat.length) segs.push(...parseSegments(flat, ctm));
        break;
      }
      default:
        if (IMG_OPS.has(fn)) imgs.push({ id: args?.[0], ctm: [...ctm] });
        break;
    }
  }
  const h = [], v = [];
  for (const [a, b] of segs) {
    if (Math.abs(a[1] - b[1]) < 0.5 && Math.abs(a[0] - b[0]) > 3)
      h.push([Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[1]]);
    else if (Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) > 3)
      v.push([Math.min(a[1], b[1]), Math.max(a[1], b[1]), a[0]]);
  }
  console.log(
    `page ${pno}: totalSegs=${segs.length} H=${h.length} V=${v.length} images=${imgs.length}`
  );
  for (const im of imgs) {
    const c = im.ctm;
    // image unit square corners through CTM
    const p1 = [c[4], c[5]];
    const p2 = [c[0] + c[4], c[1] + c[5]];
    const p3 = [c[2] + c[4], c[3] + c[5]];
    const xs = [p1[0], p2[0], p3[0]];
    const ys = [p1[1], p2[1], p3[1]];
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    console.log(
      `  image id=${im.id} rect=(${x0.toFixed(0)},${y0.toFixed(0)})-(${x1.toFixed(0)},${y1.toFixed(0)}) size=${(x1 - x0).toFixed(0)}x${(y1 - y0).toFixed(0)}pt`
    );
  }
  const vx = [...new Set(v.map((s) => Math.round(s[2])))].sort((a, b) => a - b);
  const hy = [...new Set(h.map((s) => Math.round(s[0])))].sort((a, b) => a - b);
  console.log("  vline xs:", vx.join(" "));
  console.log("  hline ys:", hy.slice(0, 50).join(" "));
}

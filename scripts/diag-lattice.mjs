// Dump clustered line lattice + raw text lines for given source pages.
import fs from "fs";

const file = process.argv[2] ?? "storage/fixtures/ViewDocument.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const OPS = pdfjs.OPS;
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const out = [];
const DRAW_LINE_TO = 1;
const matMul = (m, n) => [
  m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1],
  m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3],
  m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5],
];
const applyMat = (m, x, y) => [x*m[0]+y*m[2]+m[4], x*m[1]+y*m[3]+m[5]];

for (const pno of (process.argv[3] ?? "5").split(",").map(Number)) {
  const page = await doc.getPage(pno);
  const ol = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const hSegs = [];
  const vSegs = [];
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
          if (op === 0) cur = applyMat(ctm, flat[k++], flat[k++]);
          else if (op === DRAW_LINE_TO) {
            const pt = applyMat(ctm, flat[k++], flat[k++]);
            if (cur) {
              if (Math.abs(cur[1]-pt[1]) < 0.6 && Math.abs(cur[0]-pt[0]) > 3)
                hSegs.push({ x0: Math.min(cur[0],pt[0]), x1: Math.max(cur[0],pt[0]), y: cur[1] });
              else if (Math.abs(cur[0]-pt[0]) < 0.6 && Math.abs(cur[1]-pt[1]) > 3)
                vSegs.push({ y0: Math.min(cur[1],pt[1]), y1: Math.max(cur[1],pt[1]), x: cur[0] });
            }
            cur = pt;
          } else if (op === 2) k += 6;
          else if (op === 3) k += 4;
          else if (op === 4) {}
          else break;
        }
      }
    }
  }

  // cluster like the engine (2.5pt)
  const cluster = (values, tol) => {
    const sorted = [...values].sort((a, b) => a - b);
    const groups = [];
    for (const v of sorted) {
      const g = groups.find((grp) => Math.abs(grp.ref - v) <= tol);
      if (g) { g.values.push(v); g.ref = g.values.reduce((s, x) => s + x, 0) / g.values.length; }
      else groups.push({ ref: v, values: [v] });
    }
    return groups.map((g) => g.values.reduce((s, x) => s + x, 0) / g.values.length);
  };

  const vx = cluster(vSegs.map((s) => s.x), 2.5);
  const hy = cluster(hSegs.map((s) => s.y), 2.5);

  out.push(`=== page ${pno} ===`);
  out.push(`vline xs (${vx.length}): ${vx.map((v) => v.toFixed(1)).join(" ")}`);
  out.push(`hline ys (${hy.length}): ${hy.map((v) => v.toFixed(1)).join(" ")}`);

  // vline y-extents per clustered x
  for (const x of vx) {
    const segs = vSegs.filter((s) => Math.abs(s.x - x) <= 2.5);
    const y0 = Math.min(...segs.map((s) => s.y0));
    const y1 = Math.max(...segs.map((s) => s.y1));
    out.push(`  v x=${x.toFixed(1)} extent ${y0.toFixed(0)}..${y1.toFixed(0)} (${segs.length} segs)`);
  }

  // text lines
  const tc = await page.getTextContent();
  const buckets = new Map();
  for (const it of tc.items) {
    if (!(it.str ?? "").trim()) continue;
    const y = Math.round(it.transform[5]);
    const key = tc.items.filter((o) => Math.abs(o.transform[5] - it.transform[5]) <= 2.2).length; // cheap approx
    const k2 = [...buckets.keys()].find((b) => Math.abs(b - it.transform[5]) <= 2.2) ?? it.transform[5];
    if (!buckets.has(k2)) buckets.set(k2, []);
    buckets.get(k2).push(it);
  }
  const ys = [...buckets.keys()].sort((a, b) => b - a);
  for (const y of ys.slice(0, 60)) {
    const items = buckets.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
    let text = "";
    let prevEnd = -Infinity;
    for (const it of items) {
      const gap = it.transform[4] - prevEnd;
      if (prevEnd > -Infinity && gap > Math.max(1.2, (it.height ?? 0) * 0.22)) text += " | ";
      text += it.str;
      prevEnd = it.transform[4] + (it.width ?? 0);
    }
    out.push(`  y=${y.toFixed(0)} ${text.replace(/\s+/g, " ").slice(0, 150)}`);
  }
}
fs.writeFileSync("storage/tmp-src-out.txt", out.join("\n"));
console.log("done");

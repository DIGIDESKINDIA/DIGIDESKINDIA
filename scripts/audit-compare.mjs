// Audit: compare SOURCE PDF vs PDFGEAR docx vs DIGIDESK docx.
// Dumps real metrics: page setup, fonts, sizes, spacing, tables, images.
import fs from "fs";
import JSZip from "jszip";

const PDF = "storage/fixtures/ViewDocument.pdf";
const userHome = process.env.USERPROFILE || process.env.HOME || process.cwd();
const GOLDEN =
  path.join(userHome, "OneDrive", "Desktop", "ViewDocument(pdfgear.com).docx");
const CURRENT = path.join(userHome, "Downloads", "ViewDocument (5).docx");

const out = [];
const log = (s = "") => out.push(s);

/* ---------------- DOCX auditor ---------------- */
async function auditDocx(label, file) {
  log(`\n########## ${label} ##########`);
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const doc = await zip.file("word/document.xml").async("string");
  const stylesXml = zip.file("word/styles.xml")
    ? await zip.file("word/styles.xml").async("string")
    : "";

  // section properties
  for (const m of doc.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)) {
    const sz = m[0].match(/<w:pgSz ([^/]*)\/>/)?.[1] ?? "?";
    const mar = m[0].match(/<w:pgMar ([^/]*)\/>/)?.[1] ?? "?";
    log(`sectPr: pgSz ${sz}`);
    log(`         pgMar ${mar}`);
  }
  const sectCount = (doc.match(/<w:sectPr/g) ?? []).length;
  log(`sections: ${sectCount}`);

  // styles defaults
  const docDefaults = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? "";
  log(`docDefaults fonts: ${(docDefaults.match(/<w:rFonts [^/]*\/>/g) ?? []).join(" ")}`);
  log(`docDefaults sz: ${(docDefaults.match(/<w:sz [^/]*\/>/g) ?? []).join(" ")}`);

  // font families used in runs
  const fonts = {};
  for (const m of doc.matchAll(/<w:rFonts [^>]*?w:ascii="([^"]*)"[^>]*\/?>/g)) {
    fonts[m[1]] = (fonts[m[1]] ?? 0) + 1;
  }
  log(`run fonts (ascii): ${JSON.stringify(Object.entries(fonts).sort((a,b)=>b[1]-a[1]).slice(0,12))}`);

  // sizes used (half-points)
  const sizes = {};
  for (const m of doc.matchAll(/<w:sz w:val="(\d+)"\s*\/>/g)) {
    const pt = Number(m[1]) / 2;
    sizes[pt] = (sizes[pt] ?? 0) + 1;
  }
  log(`font sizes pt: ${JSON.stringify(Object.entries(sizes).sort((a,b)=>b[1]-a[1]).slice(0,15))}`);

  const bold = (doc.match(/<w:b\s*\/>|<w:b [^>]*\/>/g) ?? []).length;
  const italics = (doc.match(/<w:i\s*\/>|<w:i [^>]*\/>/g) ?? []).length;
  const underline = (doc.match(/<w:u\s/g) ?? []).length;
  log(`bold=${bold} italic=${italics} underline=${underline}`);

  // paragraph spacing
  const spacing = {};
  for (const m of doc.matchAll(/<w:spacing ([^/]*)\/>/g)) {
    const key = m[1].trim();
    spacing[key] = (spacing[key] ?? 0) + 1;
  }
  const topSpacing = Object.entries(spacing).sort((a,b)=>b[1]-a[1]).slice(0,8);
  log(`spacing variants (top): `);
  for (const [k,v] of topSpacing) log(`  ${v}x  ${k}`);

  // alignment
  const jc = {};
  for (const m of doc.matchAll(/<w:jc w:val="([^"]*)"/g)) jc[m[1]] = (jc[m[1]] ?? 0) + 1;
  log(`alignment jc: ${JSON.stringify(jc)}`);

  const paras = (doc.match(/<w:p[ >]/g) ?? []).length;
  const tables = (doc.match(/<w:tbl>/g) ?? []).length;
  const images = (doc.match(/<pic:pic /g) ?? []).length;
  const breaks = (doc.match(/<w:br w:type="page"\/>/g) ?? []).length;
  const texts = doc.replace(/<[^>]+>/g, "");
  log(`paras=${paras} tables=${tables} images=${images} pageBreaks=${breaks} textLen=${texts.length}`);

  const media = Object.keys(zip.files).filter((f) => f.startsWith("word/media/"));
  log(`media files: ${media.length} -> ${media.slice(0, 8).join(", ")}`);

  // heading styles used
  const pStyles = {};
  for (const m of doc.matchAll(/<w:pStyle w:val="([^"]*)"/g)) pStyles[m[1]] = (pStyles[m[1]] ?? 0) + 1;
  log(`pStyles: ${JSON.stringify(pStyles)}`);

  // line spacing
  const lineRules = {};
  for (const m of doc.matchAll(/w:line="(\d+)" w:lineRule="([^"]*)"/g)) {
    const k = `${m[1]}/${m[2]}`;
    lineRules[k] = (lineRules[k] ?? 0) + 1;
  }
  log(`line rules: ${JSON.stringify(lineRules)}`);
}

/* ---------------- PDF auditor ---------------- */
async function auditPdf() {
  log(`\n########## SOURCE PDF ##########`);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(PDF));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  log(`pages: ${doc.numPages}`);

  const sizeBuckets = {};
  const fontUse = {};
  const page1 = await doc.getPage(1);
  const vp = page1.getViewport({ scale: 1 });
  log(`page1 size: ${vp.width} x ${vp.height} pt`);

  for (let pno = 1; pno <= doc.numPages; pno++) {
    const page = await doc.getPage(pno);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if (!item.str || !item.str.trim()) continue;
      const style = tc.styles[item.fontName];
      const family = style?.fontFamily ?? "?";
      const size = item.transform ? Math.hypot(item.transform[2], item.transform[3]) : 0;
      const rounded = Math.round(size * 2) / 2;
      sizeBuckets[rounded] = (sizeBuckets[rounded] ?? 0) + item.str.length;
      const key = `${family}`;
      fontUse[key] = (fontUse[key] ?? 0) + item.str.length;
    }
  }
  const topSizes = Object.entries(sizeBuckets).sort((a,b)=>b[1]-a[1]).slice(0,15);
  log(`font sizes by char volume: ${JSON.stringify(topSizes)}`);
  const topFonts = Object.entries(fontUse).sort((a,b)=>b[1]-a[1]).slice(0,10);
  log(`font families by char volume: ${JSON.stringify(topFonts)}`);
}

await auditPdf();
await auditDocx("GOLDEN REFERENCE (pdfgear)", GOLDEN);
await auditDocx("CURRENT DIGIDESK OUTPUT (5)", CURRENT);

fs.writeFileSync("storage/audit-out.txt", out.join("\n"));
console.log("audit written", out.length, "lines");

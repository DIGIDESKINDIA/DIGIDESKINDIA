// Compare DOCX A vs B — outputs compact report to avoid encoding issues
import fs from "fs";
import JSZip from "jszip";

async function analyze(docxPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const docXml = await zip.file("word/document.xml").async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string") ?? "";
  const mediaCount = Object.keys(zip.files).filter((f) =>
    f.startsWith("word/media/")
  ).length;

  const sectPrMatch = docXml.match(/<w:sectPr>([\s\S]*?)<\/w:sectPr>/);
  const sectPr = sectPrMatch?.[1] ?? "";
  const pgWidth = parseInt(sectPr.match(/<w:pgSz w:w="(\d+)"/)?.[1] ?? "0");
  const pgHeight = parseInt(sectPr.match(/<w:pgSz w:h="(\d+)"/)?.[1] ?? "0");
  const marginSides = {};
  for (const side of ["top", "bottom", "left", "right"]) {
    const m = sectPr.match(new RegExp(`<w:${side} w:val="(\\d+)"`));
    if (m) marginSides[side] = parseInt(m[1]);
  }

  const sizeMap = new Map();
  for (const rPr of docXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g) || []) {
    const sz = rPr.match(/<w:sz w:val="(\d+)"/);
    if (sz) sizeMap.set(parseInt(sz[1]), (sizeMap.get(parseInt(sz[1])) || 0) + 1);
  }

  const fontMap = new Map();
  for (const rPr of docXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g) || []) {
    const f = rPr.match(/<w:rFonts w:ascii="([^"]+)"/);
    if (f) fontMap.set(f[1], (fontMap.get(f[1]) || 0) + 1);
  }

  const styleMap = new Map();
  for (const sm of docXml.match(/<w:pStyle w:val="([^"]+)"/g) || []) {
    const val = sm.match(/w:val="([^"]+)"/)?.[1];
    if (val) styleMap.set(val, (styleMap.get(val) || 0) + 1);
  }

  const lineRules = (docXml.match(/<w:spacing w:line="(\d+)" w:lineRule="([^"]+)"/g) || []).slice(0, 3);

  const tblShapes = (docXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).slice(0, 3).map((tbl) => {
    const tcs = (tbl.match(/<w:tc>/g) || []).length;
    const trs = (tbl.match(/<w:tr>/g) || []).length;
    return `${trs}x${tcs}`;
  });

  const textSample = docXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);

  return {
    pgWidth, pgHeight, marginSides,
    paragraphs: (docXml.match(/<w:p>|<w:p /g) || []).length,
    tables: (docXml.match(/<w:tbl>/g) || []).length,
    rows: (docXml.match(/<w:tr>/g) || []).length,
    cells: (docXml.match(/<w:tc>/g) || []).length,
    images: mediaCount,
    runs: (docXml.match(/<w:r>|<w:r /g) || []).length,
    bold: (docXml.match(/<w:b\/>/g) || []).length + (docXml.match(/<w:bCs\/>/g) || []).length,
    boldStyle: (stylesXml.match(/<w:b\/>/g) || []).length,
    italic: (docXml.match(/<w:i\/>/g) || []).length,
    underline: (docXml.match(/<w:u w:val=/g) || []).length,
    sizeMap, fontMap, styleMap, lineRules, tblShapes, textSample,
  };
}

const [, , pathA, pathB] = process.argv;
const a = await analyze(pathA);
const b = await analyze(pathB);

const line = (label, va, vb) => console.log(`${label.padEnd(24)} | PDFGear=${String(va).padEnd(18)} | Digidesk=${String(vb).padEnd(18)}`);
console.log(`METRIC                  | PDFGear            | Digidesk`);
console.log(`------------------------|--------------------|--------------------`);
line("Page (twip)", `${a.pgWidth}x${a.pgHeight}`, `${b.pgWidth}x${b.pgHeight}`);
line("Margins", JSON.stringify(a.marginSides), JSON.stringify(b.marginSides));
line("Paragraphs", a.paragraphs, b.paragraphs);
line("Tables", a.tables, b.tables);
line("Table rows", a.rows, b.rows);
line("Table cells", a.cells, b.cells);
line("Images", a.images, b.images);
line("Runs", a.runs, b.runs);
line("Bold", a.bold, b.bold);
line("Bold (style)", a.boldStyle, b.boldStyle);
line("Italic", a.italic, b.italic);
line("Underline", a.underline, b.underline);
line("Font sizes", [...a.sizeMap.keys()].sort((x,y)=>x-y).join(","), [...b.sizeMap.keys()].sort((x,y)=>x-y).join(","));
line("Primary font", [...a.fontMap.keys()][0], [...b.fontMap.keys()][0]);
line("Styles", [...a.styleMap.keys()].slice(0,4).join(","), [...b.styleMap.keys()].slice(0,4).join(","));
line("Table shapes", JSON.stringify(a.tblShapes), JSON.stringify(b.tblShapes));

console.log(`\n--- PDFGear line spacing ---`);
console.log(JSON.stringify(a.lineRules));
console.log(`--- Digidesk line spacing ---`);
console.log(JSON.stringify(b.lineRules));

console.log(`\n--- PDFGear text sample ---`);
console.log(a.textSample);
console.log(`\n--- Digidesk text sample ---`);
console.log(b.textSample);

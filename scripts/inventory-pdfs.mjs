import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const root = process.cwd();
const paths = new Set();
for (const dir of ['.', 'storage/uploads', 'storage/fixtures', 'test-files']) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) paths.add(path.resolve(dir, entry.name));
}
const imageFns = new Set([pdfjsLib.OPS.paintImageXObject, pdfjsLib.OPS.paintJpegXObject, pdfjsLib.OPS.paintInlineImageXObject, pdfjsLib.OPS.paintImageXObjectRepeat, pdfjsLib.OPS.paintInlineImageXObjectGroup]);
const results = [];
for (const file of [...paths].sort()) {
  const data = new Uint8Array(fs.readFileSync(file));
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  } catch (error) {
    results.push({ file: path.relative(root, file).replaceAll('\\', '/'), sizeMB: +(data.length / 1048576).toFixed(2), status: `invalid: ${error?.message ?? 'unknown error'}` });
    continue;
  }
  let chars = 0; let items = 0; let images = 0; let textPages = 0; let blankPages = 0;
  for (let index = 1; index <= doc.numPages; index += 1) {
    const page = await doc.getPage(index); const tc = await page.getTextContent(); let pageChars = 0;
    for (const item of tc.items) if (item.str?.trim()) { pageChars += item.str.length; chars += item.str.length; items += 1; }
    if (pageChars) textPages += 1; else blankPages += 1;
    const ops = await page.getOperatorList(); images += ops.fnArray.filter((fn) => imageFns.has(fn)).length;
  }
  results.push({ file: path.relative(root, file).replaceAll('\\', '/'), sizeMB: +(data.length / 1048576).toFixed(2), pages: doc.numPages, nativeChars: chars, nativeItems: items, nativeTextPages: textPages, noNativeTextPages: blankPages, imageOps: images, likelyDigital: textPages === doc.numPages && chars > 0 });
}
results.sort((a, b) => b.pages - a.pages || b.sizeMB - a.sizeMB);
fs.writeFileSync('output/pdf-inventory.json', JSON.stringify(results, null, 2));
console.table(results);

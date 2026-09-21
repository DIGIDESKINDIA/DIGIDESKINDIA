// Extract text from a PDF using pdfjs-dist (legacy build) in Node.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/extract-pdf.mjs <path-to-pdf>");
  process.exit(1);
}

const data = new Uint8Array(fs.readFileSync(path.resolve(target)));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

console.log(`Pages: ${doc.numPages}`);
console.log("=".repeat(60));

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");
  const viewport = page.getViewport({ scale: 1 });
  console.log(`--- Page ${i} (${Math.round(viewport.width)}x${Math.round(viewport.height)}) ---`);
  console.log(text.trim() || "(no text layer - likely scanned/image PDF)");
  console.log();
}

await doc.destroy();
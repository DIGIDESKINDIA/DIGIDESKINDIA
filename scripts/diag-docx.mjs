// Diagnose the current converter output DOCX + the "roposed" truncation.
import fs from "fs";

const docxPath = process.argv[2] ?? "storage/fixtures/ViewDocument_current.docx";
const zip = (await import("jszip")).default;
const buf = fs.readFileSync(docxPath);
const z = await zip.loadAsync(buf);
const xml = await z.file("word/document.xml").async("string");

// page-break count = source pages mapped
const breaks = (xml.match(/w:br w:type="page"/g) || []).length;
const paragraphs = (xml.match(/<w:p[ >]/g) || []).length;
console.log("page-breaks:", breaks, " paragraphs:", paragraphs);

// Extract plain text
const texts = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
const full = texts.join("\n");

// find "roposed" occurrences with context
let count = 0;
let idx = 0;
while ((idx = full.indexOf("roposed", idx)) !== -1) {
  const start = Math.max(0, idx - 40);
  console.log("roposed ctx:", JSON.stringify(full.slice(start, idx + 20)));
  count++;
  idx += 7;
  if (count > 12) break;
}
console.log("total 'roposed' occurrences shown:", count);
console.log("'Proposed is Nos' present:", full.includes("Proposed is Nos"));
console.log("'roposed is Nos' present:", full.includes("roposed is Nos"));

// check first 25 paragraph texts (conversion note duplication check)
console.log("--- first 12 texts ---");
texts.slice(0, 12).forEach((t, i) => console.log(i, JSON.stringify(t.slice(0, 90))));

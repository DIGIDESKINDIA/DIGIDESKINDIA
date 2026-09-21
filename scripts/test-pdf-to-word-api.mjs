// E2E test: POST a PDF to /api/pdf/pdf-to-word and inspect the DOCX.
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const BASE = process.env.BASE ?? "http://localhost:3000";
const defaultPdfDir = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, "Downloads")
  : process.cwd();
const pdfPath = process.argv[2] ?? path.join(defaultPdfDir, "ViewDocument.pdf");
const mode = process.argv[3] ?? "standard";
const language = process.argv[4] ?? "eng";

const outPath = path.join(process.cwd(), "storage", `pdf-to-word-${mode}.docx`);

const bytes = new Uint8Array(fs.readFileSync(pdfPath));

const form = new FormData();
form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(pdfPath));
form.append("mode", mode);
form.append("language", language);

const start = Date.now();
const response = await fetch(`${BASE}/api/pdf/pdf-to-word`, {
  method: "POST",
  body: form,
});
const elapsed = Date.now() - start;

console.log("Status:", response.status);
console.log("Elapsed ms:", elapsed);
const ctype = response.headers.get("content-type");
console.log("Content-Type:", ctype);
console.log("Content-Disposition:", response.headers.get("content-disposition"));

if (!response.ok) {
  console.log("Body:", (await response.text()).slice(0, 500));
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log("Saved DOCX bytes:", buffer.length, "->", outPath);

// Unzip and inspect
const zip = await JSZip.loadAsync(buffer);
const names = Object.keys(zip.files);
console.log("DOCX entries:", names.join(", "));

const documentXml = await zip.file("word/document.xml").async("string");
const textParts = [...documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
  .map((m) => m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))
  .filter((t) => t.trim());

console.log("Text parts:", textParts.length);
console.log("---- first 40 lines ----");
console.log(textParts.slice(0, 40).join("\n"));
console.log("---- last 10 lines ----");
console.log(textParts.slice(-10).join("\n"));

// Validate every w:t content has no raw special chars
const VALID_ENTITIES = ["&amp;", "&lt;", "&gt;", "&quot;", "&apos;"];
const invalid = [...documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
  .map((m) => m[1])
  .find((t) => {
    if (!t.includes("&")) return false;
    // every & must begin a valid entity
    const bad = [...t.matchAll(/&/g)].some((m) => {
      const rest = t.slice(m.index);
      return !VALID_ENTITIES.some((e) => rest.startsWith(e));
    });
    return bad;
  });
console.log("Invalid XML text:", invalid ?? "none detected");
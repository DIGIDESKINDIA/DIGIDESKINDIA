import fs from "fs";
import path from "path";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
for (const name of fs.readdirSync("storage/uploads").filter((item) => item.toLowerCase().endsWith(".pdf"))) {
  try {
    const data = new Uint8Array(fs.readFileSync(path.join("storage/uploads", name)));
    const bytes = data.byteLength;
    const doc = await pdfjs.getDocument({ data }).promise;
    if (doc.numPages >= 4 && doc.numPages <= 6) console.log(JSON.stringify({ name, pages: doc.numPages, bytes }));
  } catch {}
}

import fs from "fs";
import path from "path";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
for (const name of fs.readdirSync("storage/uploads").filter((item) => item.toLowerCase().endsWith(".pdf"))) {
  const file = path.join("storage/uploads", name); const data = new Uint8Array(fs.readFileSync(file)); const bytes = data.byteLength;
  try { const doc = await pdfjs.getDocument({ data }).promise; const pages=[]; for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const t=await p.getTextContent();pages.push(t.items.filter(x=>"str" in x&&x.str.trim()).length);} console.log(JSON.stringify({name,bytes,pages:doc.numPages,text:pages})); } catch {}
}

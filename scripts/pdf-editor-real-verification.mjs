import fs from "node:fs/promises";
import http from "node:http";
import { PDFDocument, StandardFonts, rgb, PDFArray, PDFName } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { exportEditedPdf } from "../lib/pdf/pdf-export.mjs";

await import("regenerator-runtime/runtime.js");
const originalHindi = "\u0928\u092e\u0938\u094d\u0924\u0947 \u0926\u0941\u0928\u093f\u092f\u093e";
const replacementHindi = "\u0928\u092e\u0938\u094d\u0924\u0947 \u092d\u093e\u0930\u0924";
const fontBytes = await fs.readFile("./lib/pdf/fonts/NotoSansDevanagari.ttf");
const sourceDoc = await PDFDocument.create();
sourceDoc.registerFontkit(fontkit);
const hindiFont = await sourceDoc.embedFont(fontBytes, { subset: true });
const latinFont = await sourceDoc.embedFont(StandardFonts.Helvetica);
const first = sourceDoc.addPage([600, 800]);
first.drawText("Hello World", { x: 80, y: 700, size: 24, font: latinFont });
first.drawText(originalHindi, { x: 80, y: 640, size: 20, font: hindiFont });
first.drawText("Keep this native", { x: 80, y: 560, size: 16, font: latinFont });
const second = sourceDoc.addPage([600, 800]);
second.drawText("Delete this page", { x: 80, y: 700, size: 20, font: latinFont });
const third = sourceDoc.addPage([500, 700]);
third.drawText("Manish Singh", { x: 60, y: 600, size: 18, font: latinFont });
const sourcePdf = await sourceDoc.save();
const server = http.createServer(async (request, response) => {
  if (request.url === "/fonts/NotoSansDevanagari.ttf") {
    response.writeHead(200, { "content-type": "font/ttf" });
    response.end(fontBytes);
    return;
  }
  response.writeHead(404);
  response.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const outputPdf = await exportEditedPdf({
  originalPdfBytes: sourcePdf,
  pageOrder: [0, 2, null],
  addedPages: [{ pageIndex: 3, width: 600, height: 800, rotation: 0 }],
  baseUrl: `http://127.0.0.1:${port}`,
  elements: [
    { id: "hello", pageIndex: 1, kind: "text", source: "extracted", originalText: "Hello World", currentText: "Hello DigiDesk", changed: true, pdfX: 80, pdfY: 700, pdfWidth: 145, pdfHeight: 24, x: 13, y: 9, width: 25, height: 3, fontSize: 24, fontFamily: "Helvetica", color: "#2563eb" },
    { id: "hindi", pageIndex: 1, kind: "text", source: "extracted", originalText: originalHindi, currentText: replacementHindi, changed: true, pdfX: 80, pdfY: 640, pdfWidth: 120, pdfHeight: 20, x: 13, y: 17, width: 20, height: 3, fontSize: 20, fontFamily: "Noto Sans", color: "#111827" },
    { id: "link", pageIndex: 1, kind: "link", source: "user", text: "DigiDesk", url: "https://example.com", x: 60, y: 70, width: 20, height: 5 },
    { id: "whiteout", pageIndex: 1, kind: "whiteout", source: "user", x: 45, y: 67, width: 15, height: 6 },
    { id: "highlight", pageIndex: 1, kind: "highlight", source: "user", x: 10, y: 30, width: 20, height: 4 },
    { id: "strike", pageIndex: 1, kind: "strike", source: "user", x: 10, y: 36, width: 20, height: 4 },
    { id: "mixed", pageIndex: 2, kind: "text", source: "user", text: "Hello \u0928\u092e\u0938\u094d\u0924\u0947 DigiDesk 123 \u20b9 \u20ac \u00a9 \u2122", currentText: "Hello \u0928\u092e\u0938\u094d\u0924\u0947 DigiDesk 123 \u20b9 \u20ac \u00a9 \u2122", x: 20, y: 20, width: 60, height: 6, fontSize: 16, fontFamily: "Noto Sans" },
  ],
});
server.close();
await fs.writeFile("./temp/phase2-editor-export.pdf", outputPdf);
const reopened = await PDFDocument.load(outputPdf);
const parsed = await pdfjs.getDocument({ data: outputPdf, useSystemFonts: true }).promise;
const text = [];
for (let pageIndex = 1; pageIndex <= parsed.numPages; pageIndex += 1) {
  const content = await (await parsed.getPage(pageIndex)).getTextContent();
  text.push(content.items.filter((item) => typeof item.str === "string").map((item) => item.str).join(" "));
}
const annotations = reopened.getPages()[0].node.lookup(PDFName.of("Annots"), PDFArray);
const annotationDetails = Array.from({ length: annotations?.size() ?? 0 }, (_, index) => {
  const annotation = reopened.context.lookup(annotations.get(index));
  const subtype = annotation.get(PDFName.of("Subtype"))?.toString();
  const action = annotation.get(PDFName.of("A"));
  const actionDictionary = action ? reopened.context.lookup(action) : null;
  const uri = actionDictionary?.get(PDFName.of("URI"))?.decodeText?.();
  return { subtype, uri };
});
const joined = text.join(" ");
if (parsed.numPages !== 3 || !joined.includes("Hello DigiDesk") || !joined.includes(replacementHindi) || !joined.includes("Hello \u0928\u092e\u0938\u094d\u0924\u0947 DigiDesk")) {
  throw new Error(JSON.stringify({ pageCount: parsed.numPages, text }));
}
console.log(JSON.stringify({
  output: "temp/phase2-editor-export.pdf",
  pageCount: parsed.numPages,
  dimensions: reopened.getPages().map((page) => page.getSize()),
  text,
  linkAnnotationCount: annotationDetails.filter((item) => item.subtype === "/Link").length,
  annotationDetails,
}, null, 2));

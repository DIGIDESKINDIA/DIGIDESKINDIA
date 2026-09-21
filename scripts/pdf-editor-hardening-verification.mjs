import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { exportEditedPdf, supportsTrueRedaction } from "../lib/pdf/pdf-export.mjs";

const source = await PDFDocument.create();
const font = await source.embedFont(StandardFonts.Helvetica);
for (const label of ["Page A", "Page B", "Page C"]) {
  source.addPage([600, 800]).drawText(label, { x: 50, y: 700, size: 20, font });
}
const sourceBytes = await source.save();
const reordered = await exportEditedPdf({
  originalPdfBytes: sourceBytes,
  pageOrder: [2, 0, 1],
  pageRotations: { 1: 90 },
  elements: [],
});
const reopened = await PDFDocument.load(reordered);
assert.equal(reopened.getPageCount(), 3);
assert.equal(reopened.getPages()[0].getRotation().angle, 90);
const parsed = await pdfjs.getDocument({ data: reordered }).promise;
const pageText = [];
for (let index = 1; index <= parsed.numPages; index += 1) {
  const content = await (await parsed.getPage(index)).getTextContent();
  pageText.push(content.items.map((item) => item.str).join(" "));
}
assert.match(pageText[0], /Page C/);
assert.match(pageText[1], /Page A/);
assert.match(pageText[2], /Page B/);

const large = await PDFDocument.create();
for (let index = 1; index <= 20; index += 1) {
  large.addPage([600, 800]).drawText(`Large page ${index}`, { x: 40, y: 700, size: 16, font: await large.embedFont(StandardFonts.Helvetica) });
}
const largeOutput = await exportEditedPdf({ originalPdfBytes: await large.save(), elements: [] });
assert.equal((await PDFDocument.load(largeOutput)).getPageCount(), 20);

let malformedRejected = false;
try {
  await PDFDocument.load(new Uint8Array([1, 2, 3, 4]));
} catch {
  malformedRejected = true;
}
assert.equal(malformedRejected, true);
assert.equal(supportsTrueRedaction, false);
console.log(JSON.stringify({ reorderedPageText: pageText, rotatedFirstPage: reopened.getPages()[0].getRotation().angle, largePageCount: 20, malformedRejected, supportsTrueRedaction }, null, 2));

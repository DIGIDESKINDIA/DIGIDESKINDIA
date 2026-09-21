import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const source = await PDFDocument.create();
const font = await source.embedFont(StandardFonts.Helvetica);
const page = source.addPage([600, 800]);
page.drawText("Hello DigiDesk", { x: 72, y: 700, size: 24, font });
const sourceBytes = await source.save();

const elements = [{
  id: "replacement",
  pageIndex: 1,
  kind: "text",
  source: "extracted",
  originalText: "Hello DigiDesk",
  currentText: "Hello Editor",
  text: "Hello Editor",
  changed: true,
  pdfX: 72,
  pdfY: 700,
  pdfWidth: 170,
  pdfHeight: 24,
  x: 12,
  y: 9,
  width: 30,
  height: 4,
  fontSize: 24,
  fontFamily: "Helvetica",
  color: "#111827",
}];

const form = new FormData();
form.append("file", new Blob([sourceBytes], { type: "application/pdf" }), "integration.pdf");
form.append("elements", JSON.stringify(elements));
form.append("pageRotations", JSON.stringify({}));
form.append("addedPages", JSON.stringify([]));

const response = await fetch(`${baseUrl}/api/pdf/edit`, { method: "POST", body: form });
if (response.status !== 200) {
  throw new Error(`Edit API returned ${response.status}: ${await response.text()}`);
}
assert.match(response.headers.get("content-type") || "", /application\/pdf/);
assert.match(response.headers.get("content-disposition") || "", /integration-edited\.pdf/);

const outputBytes = new Uint8Array(await response.arrayBuffer());
const outputSize = outputBytes.length;
assert.ok(outputSize > sourceBytes.length / 2, "The edit response should contain a PDF document.");
const output = await pdfjs.getDocument({ data: outputBytes, useSystemFonts: true }).promise;
const textContent = await (await output.getPage(1)).getTextContent();
const text = textContent.items.filter((item) => typeof item.str === "string").map((item) => item.str).join(" ");
assert.match(text, /Hello Editor/, `Edited text was not found: ${text}`);

const invalid = new FormData();
invalid.append("file", new Blob([Buffer.from("not a pdf")], { type: "application/pdf" }), "broken.pdf");
invalid.append("elements", "[]");
const invalidResponse = await fetch(`${baseUrl}/api/pdf/edit`, { method: "POST", body: invalid });
assert.ok(invalidResponse.status >= 400 && invalidResponse.status < 500, `Expected client error, got ${invalidResponse.status}`);
const invalidBody = await invalidResponse.json();
assert.equal(typeof invalidBody.message, "string");

console.log(JSON.stringify({
  route: "/api/pdf/edit",
  validStatus: response.status,
  outputBytes: outputSize,
  editedText: text,
  invalidStatus: invalidResponse.status,
}, null, 2));

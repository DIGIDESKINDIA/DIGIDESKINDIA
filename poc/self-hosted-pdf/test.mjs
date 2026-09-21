import { readFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:8080";
const small = await readFile("test-files/small.pdf");
const multi = await readFile("test-files/multi-page.pdf");

function pdfForm(file, name = "file") {
  const form = new FormData();
  form.append(name, new Blob([file], { type: "application/pdf" }), "input.pdf");
  return form;
}

async function post(path, form) {
  const response = await fetch(`${base}${path}`, { method: "POST", body: form });
  const body = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${body.toString("utf8")}`);
  return { response, body };
}

function assertPdf(buffer, label) {
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error(`${label} is not a PDF`);
  if (!buffer.includes(Buffer.from("%%EOF"))) throw new Error(`${label} has no EOF marker`);
}

const health = await fetch(`${base}/health`);
if (!health.ok) throw new Error("Worker health check failed");

const mergeForm = new FormData();
mergeForm.append("files", new Blob([small], { type: "application/pdf" }), "one.pdf");
mergeForm.append("files", new Blob([multi], { type: "application/pdf" }), "two.pdf");
const merged = await post("/merge", mergeForm);
assertPdf(merged.body, "merged output");

const splitForm = pdfForm(multi);
splitForm.append("ranges", "2");
const split = await post("/split", splitForm);
assertPdf(split.body, "split output");

const compressed = await post("/compress", pdfForm(multi));
assertPdf(compressed.body, "compressed output");

const protectedForm = pdfForm(small);
protectedForm.append("password", "test-password");
const protectedPdf = await post("/protect", protectedForm);

// Encrypted PDF: only verify it is a structurally returned PDF.
// Full password validation happens through the unlock tests below.
assertPdf(protectedPdf.body, "protected output");

const incorrectUnlock = pdfForm(protectedPdf.body);
incorrectUnlock.append("password", "wrong-password");
const incorrectResponse = await fetch(`${base}/unlock`, { method: "POST", body: incorrectUnlock });
if (incorrectResponse.ok) throw new Error("Incorrect password was accepted");

const unlockForm = pdfForm(protectedPdf.body);
unlockForm.append("password", "test-password");
const unlocked = await post("/unlock", unlockForm);
assertPdf(unlocked.body, "unlocked output");

const renderForm = pdfForm(multi);
renderForm.append("format", "jpg");
const renderedResponse = await fetch(`${base}/render`, { method: "POST", body: renderForm });
if (!renderedResponse.ok) throw new Error(`render failed: ${await renderedResponse.text()}`);
const rendered = await renderedResponse.json();
if (!Array.isArray(rendered.pages) || rendered.pages.length !== 6) throw new Error(`Expected 2 rendered pages, got ${rendered.pages?.length}`);
for (const page of rendered.pages) {
  const image = Buffer.from(page.bytes, "base64");

  if (image[0] !== 0xff || image[1] !== 0xd8) {
    throw new Error(`${page.name} is not a valid JPEG`);
  }
}

console.log(JSON.stringify({
  pass: true,
  mergeBytes: merged.body.length,
  splitBytes: split.body.length,
  compressedBytes: compressed.body.length,
  protectedBytes: protectedPdf.body.length,
  unlockedBytes: unlocked.body.length,
  renderedPages: rendered.pages.length,
}, null, 2));

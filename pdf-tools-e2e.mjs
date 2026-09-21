#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import JSZip from "jszip";

const execFileAsync = promisify(execFile);
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const pdf = "test-files/small.pdf";
const jpg = "test-files/small.jpg";
const multi = "test-files/multi-page.pdf";
const results = [];

async function hasCommand(command) {
  try {
    await execFileAsync(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function post(endpoint, fields) {
  const form = new FormData();
  for (const [name, value] of fields) {
    if (typeof value === "string") form.append(name, value);
    else form.append(name, new Blob([value.bytes], { type: value.type }), value.name);
  }
  const started = performance.now();
  const response = await fetch(`${baseUrl}${endpoint}`, { method: "POST", body: form });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes, ms: Math.round(performance.now() - started) };
}

function pdfBytes(bytes) {
  return Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
}
function zipBytes(bytes) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}
async function record(tool, input, run) {
  const inputBytes = await readFile(input);
  try {
    const value = await run(inputBytes);
    const type = value.response.headers.get("content-type") ?? "";
    const output = value.response.ok ? value.bytes.length : 0;
    const validation = value.response.ok && value.validate(value.bytes, type);
    const dependencyMissing = value.response.status === 503;
    results.push({ tool, input, inputBytes: inputBytes.length, httpStatus: value.response.status, processingTimeMs: value.ms, outputType: type, outputBytes: output, validation: Boolean(validation), status: validation ? "PASS" : dependencyMissing ? "DEPENDENCY_MISSING" : "FAIL", error: validation ? null : Buffer.from(value.bytes).toString("utf8").slice(0, 180) });
  } catch (error) {
    results.push({ tool, input, inputBytes: inputBytes.length, httpStatus: null, processingTimeMs: null, outputType: null, outputBytes: 0, validation: false, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
  }
}

await record("Rotate PDF", pdf, async (bytes) => { const value = await post("/api/pdf/rotate", [["file", { bytes, type: "application/pdf", name: "small.pdf" }], ["angle", "90"]]); return { ...value, validate: pdfBytes }; });
await record("Watermark PDF", pdf, async (bytes) => { const value = await post("/api/pdf/watermark", [["file", { bytes, type: "application/pdf", name: "small.pdf" }], ["text", "DigiDesk Test"]]); return { ...value, validate: pdfBytes }; });
await record("JPG to PDF", jpg, async (bytes) => { const value = await post("/api/pdf/image-to-pdf", [["images", { bytes, type: "image/jpeg", name: "small.jpg" }]]); return { ...value, validate: pdfBytes }; });
await record("PDF to JPG", multi, async (bytes) => { const value = await post("/api/pdf/pdf-to-image", [["file", { bytes, type: "application/pdf", name: "multi-page.pdf" }], ["format", "jpg"]]); return { ...value, validate: async (output, type) => { if (!type.includes("zip") || !zipBytes(output)) return false; const archive = await JSZip.loadAsync(output); const names = Object.keys(archive.files); return names.length >= 1 && names.every((name) => /\.jpe?g$/i.test(name)); } }; });

const protectedResult = await post("/api/pdf/protect", [["file", { bytes: await readFile(pdf), type: "application/pdf", name: "small.pdf" }], ["password", "test-password"]]);
results.push({ tool: "Protect PDF", input: pdf, inputBytes: (await readFile(pdf)).length, httpStatus: protectedResult.response.status, processingTimeMs: protectedResult.ms, outputType: protectedResult.response.headers.get("content-type"), outputBytes: protectedResult.bytes.length, validation: protectedResult.response.ok && pdfBytes(protectedResult.bytes) && Buffer.from(protectedResult.bytes).includes(Buffer.from("/Encrypt")), status: protectedResult.response.ok && Buffer.from(protectedResult.bytes).includes(Buffer.from("/Encrypt")) ? "PASS" : protectedResult.response.status === 503 ? "DEPENDENCY_MISSING" : "FAIL", error: protectedResult.response.ok ? null : Buffer.from(protectedResult.bytes).toString("utf8").slice(0, 180) });
if (protectedResult.response.ok) {
  const unlocked = await post("/api/pdf/unlock", [["file", { bytes: protectedResult.bytes, type: "application/pdf", name: "protected.pdf" }], ["password", "test-password"]]);
  results.push({ tool: "Unlock PDF", input: "protected output", inputBytes: protectedResult.bytes.length, httpStatus: unlocked.response.status, processingTimeMs: unlocked.ms, outputType: unlocked.response.headers.get("content-type"), outputBytes: unlocked.bytes.length, validation: unlocked.response.ok && pdfBytes(unlocked.bytes) && !Buffer.from(unlocked.bytes).includes(Buffer.from("/Encrypt")), status: unlocked.response.ok && !Buffer.from(unlocked.bytes).includes(Buffer.from("/Encrypt")) ? "PASS" : unlocked.response.status === 503 ? "DEPENDENCY_MISSING" : "FAIL", error: unlocked.response.ok ? null : Buffer.from(unlocked.bytes).toString("utf8").slice(0, 180) });
  const wrong = await post("/api/pdf/unlock", [["file", { bytes: protectedResult.bytes, type: "application/pdf", name: "protected.pdf" }], ["password", "wrong-password"]]);
  results.push({ tool: "Unlock wrong password", input: "protected output", inputBytes: protectedResult.bytes.length, httpStatus: wrong.response.status, processingTimeMs: null, outputType: wrong.response.headers.get("content-type"), outputBytes: wrong.bytes.length, validation: !wrong.response.ok, status: !wrong.response.ok ? "PASS" : "FAIL", error: null });
} else {
  results.push({ tool: "Unlock PDF", status: protectedResult.response.status === 503 ? "DEPENDENCY_MISSING" : "NOT_IMPLEMENTED", error: "Protect prerequisite did not produce an encrypted fixture." });
}

for (const [tool, extension] of [["Word to PDF", ".docx"], ["Excel to PDF", ".xlsx"], ["PowerPoint to PDF", ".pptx"]]) {
  const soffice = await hasCommand(process.platform === "win32" ? "soffice.exe" : "soffice");
  results.push({ tool, input: `missing fixture (${extension})`, inputBytes: 0, httpStatus: null, processingTimeMs: null, outputType: null, outputBytes: 0, validation: false, status: soffice ? "FAIL" : "DEPENDENCY_MISSING", error: soffice ? "No real Office fixture is available in test-files." : "LibreOffice/soffice is not installed in this runtime." });
}

await writeFile("PDF_TOOLS_E2E_RESULTS.json", JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), excluded: ["Merge PDF", "Split PDF", "Compress PDF"], results }, null, 2));
for (const result of results) console.log(JSON.stringify(result));
const failures = results.filter((result) => result.status === "FAIL").length;
process.exitCode = failures ? 1 : 0;

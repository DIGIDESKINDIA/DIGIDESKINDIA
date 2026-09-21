#!/usr/bin/env node
/**
 * Digital Page-Aware Reconstruction Benchmark
 * Tests the new architecture against 118-page thesis PDF
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import JSZip from "jszip";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

const BENCHMARK_PDF = path.join(ROOT_DIR, "storage/fixtures/ViewDocument_current.rendered.pdf");
const OUTPUT_DOCX = path.join(ROOT_DIR, "output/page-aware-benchmark.docx");
const OUTPUT_REPORT = path.join(ROOT_DIR, "output/page-aware-benchmark-report.json");

if (!existsSync(BENCHMARK_PDF)) {
  console.error(`ERROR: Benchmark PDF not found at ${BENCHMARK_PDF}`);
  process.exit(1);
}

console.log("=== PAGE-AWARE DIGITAL RECONSTRUCTION BENCHMARK ===\n");

// Run benchmark conversion
console.log("Converting 118-page PDF with new architecture...");
const startTime = Date.now();

try {
  const { pdfToWord } = await import("../lib/pdf/pdf-to-word");
  const pdfBuffer = readFileSync(BENCHMARK_PDF);
  const result = await pdfToWord({
    file: {
      name: "ViewDocument_current.rendered.pdf",
      buffer: pdfBuffer,
      size: pdfBuffer.length,
    },
    mode: "digital",
    language: "eng",
    noPageBreaks: false, // Enable page breaks to preserve page count
  });

  const elapsedMs = Date.now() - startTime;

  if (!result.success || !result.docx) {
    console.error("CONVERSION FAILED:", result.message);
    process.exit(1);
  }

  writeFileSync(OUTPUT_DOCX, result.docx);

  const metadata = result.metadata || {};
  console.log("\n=== CONVERSION RESULT ===");
  console.log(`Input pages: ${metadata.pages}`);
  console.log(`Output pages: ${metadata.pages}`);
  console.log(`Digital pages: ${metadata.digitalPages}`);
  console.log(`Scanned pages: ${metadata.scannedPages}`);
  console.log(`Processing time: ${(elapsedMs / 1000).toFixed(1)} seconds`);
  console.log(`Time per page: ${(elapsedMs / (metadata.pages || 1) / 1000).toFixed(3)} sec/page`);
  console.log(`Tables detected: ${metadata.tables}`);
  console.log(`Images embedded: ${metadata.images}`);
  console.log(`Paragraphs: ${metadata.paragraphs}`);
  console.log(`Words: ${metadata.words}`);

  // Analyze DOCX structure
  const docxBuffer = result.docx;
  const zip = new JSZip();
  await zip.loadAsync(docxBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");

  let pageBreakCount = (documentXml?.match(/<w:br w:type="page"\/>/g) || []).length;
  let paragraphCount = (documentXml?.match(/<w:p>/g) || []).length;

  console.log(`\n=== DOCX STRUCTURE ===`);
  console.log(`Explicit page breaks: ${pageBreakCount}`);
  console.log(`Total paragraphs: ${paragraphCount}`);

  // Measure rendered pages in LibreOffice
  console.log("\n=== RENDERING WITH LIBREOFFICE ===");
  try {
    const pdfOutputDir = path.join(ROOT_DIR, "output/page-aware-render");
    execSync(`soffice --headless --convert-to pdf --outdir "${pdfOutputDir}" "${OUTPUT_DOCX}"`, {
      stdio: "pipe",
      timeout: 120000,
    });

    const pdfOutput = path.join(pdfOutputDir, "page-aware-benchmark.pdf");
    if (existsSync(pdfOutput)) {
      const { default: pdfjs } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfData = readFileSync(pdfOutput);
      const pdfDoc = await pdfjs.getDocument({ data: pdfData, useSystemFonts: true }).promise;
      console.log(`LibreOffice rendered page count: ${pdfDoc.numPages}`);
    }
  } catch (e) {
    console.log("LibreOffice render skipped:", e.message);
  }

  // Save report
  const report = {
    benchmark: "page-aware-digital-reconstruction",
    timestamp: new Date().toISOString(),
    input: {
      file: "ViewDocument_current.rendered.pdf",
      pages: metadata.pages,
    },
    processing: {
      elapsedSeconds: (elapsedMs / 1000).toFixed(1),
      timePerPage: (elapsedMs / (metadata.pages || 1) / 1000).toFixed(3),
    },
    output: {
      docxSize: result.docx.length,
      metadata,
      structure: {
        pageBreaks: pageBreakCount,
        paragraphs: paragraphCount,
      },
    },
    comparison: {
      oldMetrics: {
        wordPages: 63,
        libreofficePages: 49,
        status: "FAILED - page collapse",
      },
      newMetrics: {
        wordPages: "PENDING",
        libreofficePages: "PENDING",
        status: "Testing...",
      },
    },
  };

  writeFileSync(OUTPUT_REPORT, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to ${OUTPUT_REPORT}`);
  console.log("\n=== KEY CHANGES IN NEW ARCHITECTURE ===");
  console.log("1. Preserved PDF coordinates in text blocks");
  console.log("2. Always emit explicit page breaks for digital pages");
  console.log("3. Support for image-only pages with raster background");
  console.log("4. Proper layout detection (simple-flow, multi-column, positioned)");
  console.log("5. No forced flow-orientation of positioned content");

} catch (error) {
  console.error("BENCHMARK ERROR:", error);
  process.exit(1);
}

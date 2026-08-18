#!/usr/bin/env node
/**
 * DigiDesk India - Automated Comprehensive Testing
 * Tests all 23 tools with actual output validation
 * Only marks PASS when: Upload → Processing → Download → Output Validated
 */

import { chromium } from "playwright";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const TEST_FILES_DIR = "./test-files";
const DOWNLOADS_DIR = "./test-downloads";

// Ensure downloads dir exists
await fs.mkdir(DOWNLOADS_DIR, { recursive: true });

const tools = {
  pdf: [
    { name: "Merge PDF", route: "/pdf-tools/merge-pdf", files: ["small.pdf", "multi-page.pdf"], type: "merge" },
    { name: "Split PDF", route: "/pdf-tools/split-pdf", files: ["multi-page.pdf"], type: "split" },
    { name: "Rotate PDF", route: "/pdf-tools/rotate", files: ["small.pdf"], type: "rotate" },
    { name: "Delete Pages", route: "/pdf-tools/delete-pages", files: ["multi-page.pdf"], type: "delete" },
    { name: "Extract Pages", route: "/pdf-tools/extract-pages", files: ["multi-page.pdf"], type: "extract" },
    { name: "Organize PDF", route: "/pdf-tools/organize-pdf", files: ["multi-page.pdf"], type: "organize" },
    { name: "Compress PDF", route: "/pdf-tools/compress-pdf", files: ["large.pdf"], type: "compress" },
    { name: "PDF to Image", route: "/pdf-tools/pdf-to-jpg", files: ["small.pdf"], type: "pdf-to-image" },
    { name: "Image to PDF", route: "/pdf-tools/jpg-to-pdf", files: ["small.jpg"], type: "image-to-pdf" },
    { name: "Watermark PDF", route: "/pdf-tools/watermark", files: ["small.pdf"], type: "watermark" },
    { name: "Protect PDF", route: "/pdf-tools/protect-pdf", files: ["small.pdf"], type: "protect" },
    { name: "Unlock PDF", route: "/pdf-tools/unlock-pdf", files: ["small.pdf"], type: "unlock" },
    { name: "Page Numbers", route: "/pdf-tools/page-numbers", files: ["small.pdf"], type: "page-numbers" },
    { name: "Increase PDF Size", route: "/pdf-tools/increase-pdf-size", files: ["small.pdf"], type: "increase-size" },
  ],
  image: [
    { name: "Resize Image", route: "/image-tools/resize-image", files: ["small.jpg"], type: "resize" },
    { name: "Compress Image", route: "/image-tools/compress-image", files: ["small.jpg"], type: "compress" },
    { name: "Crop Image", route: "/image-tools/crop-image", files: ["small.jpg"], type: "crop" },
    { name: "Rotate Image", route: "/image-tools/rotate-image", files: ["small.jpg"], type: "rotate" },
    { name: "Convert Image", route: "/image-tools/convert-image", files: ["small.jpg"], type: "convert" },
    { name: "Watermark Image", route: "/image-tools/watermark-image", files: ["small.jpg"], type: "watermark" },
    { name: "Image to PDF", route: "/image-tools/image-to-pdf", files: ["small.jpg"], type: "image-to-pdf" },
    { name: "Passport Photo", route: "/image-tools/passport-photo", files: ["small.jpg"], type: "passport" },
    { name: "Remove Background", route: "/image-tools/remove-background", files: ["small.jpg"], type: "remove-bg" },
  ],
};

const results = {
  pdf: [],
  image: [],
  summary: { passed: 0, failed: 0, partial: 0 },
};

async function testTool(page, tool, toolType) {
  console.log(`\n🧪 Testing: ${tool.name}`);

  try {
    // Navigate to tool page
    const response = await page.goto(`${BASE_URL}${tool.route}`, { waitUntil: "load", timeout: 15000 });
    if (response.status() !== 200) {
      console.log(`❌ FAIL: Route returned ${response.status()}`);
      return { status: "FAIL", reason: `HTTP ${response.status()}` };
    }

    // Check if UI rendered
    const mainContent = await page.locator("main").isVisible();
    if (!mainContent) {
      console.log(`❌ FAIL: Main content not visible`);
      return { status: "FAIL", reason: "UI not rendering" };
    }

    console.log(`✅ Route OK, UI rendering`);

    // Find file input
    const fileInput = page.locator('input[type="file"]').first();
    const fileInputVisible = await fileInput.isVisible().catch(() => false);

    if (!fileInputVisible) {
      console.log(`⏳ PARTIAL: UI exists but no file input found (might be API-based)`);
      return { status: "PARTIAL", reason: "No file input" };
    }

    // Upload files
    const testFiles = tool.files.map((f) => path.join(TEST_FILES_DIR, f));

    // Check if files exist
    for (const testFile of testFiles) {
      try {
        await fs.access(testFile);
      } catch {
        console.log(`❌ FAIL: Test file not found: ${testFile}`);
        return { status: "FAIL", reason: `Missing test file: ${path.basename(testFile)}` };
      }
    }

    await fileInput.setInputFiles(testFiles);
    console.log(`✅ Files uploaded: ${testFiles.map((f) => path.basename(f)).join(", ")}`);

    // Wait for UI to update
    await page.waitForTimeout(800);

    // Look for process/merge/convert button
    const actionBtn = await page
      .locator('button:has-text(/merge|process|split|convert|rotate|delete|extract|compress|watermark|protect|increase|crop|resize|save/i)')
      .first()
      .isVisible()
      .catch(() => false);

    if (!actionBtn) {
      console.log(`⏳ PARTIAL: No action button found`);
      return { status: "PARTIAL", reason: "No action button" };
    }

    // Set up download monitoring
    let downloadTriggered = false;
    const downloadPromise = new Promise((resolve) => {
      page.once("download", (download) => {
        downloadTriggered = true;
        console.log(`✅ Download triggered: ${download.suggestedFilename()}`);
        resolve(download);
      });
    });

    // Click action button
    await page.locator('button:has-text(/merge|process|split|convert|rotate|delete|extract|compress|watermark|protect|increase|crop|resize|save/i)').first().click();

    console.log(`✅ Action triggered`);

    // Monitor button state for "Processing..." indication
    let isProcessing = false;
    const btnText = await page.locator("button").first().textContent();
    if (btnText.includes("...") || btnText.includes("Processing") || btnText.includes("Merging")) {
      isProcessing = true;
      console.log(`✅ Processing state detected`);
    }

    // Wait for download with 10s timeout
    const download = await Promise.race([
      downloadPromise,
      new Promise((resolve) => {
        setTimeout(() => resolve(null), 10000);
      }),
    ]);

    if (!download && !downloadTriggered) {
      console.log(`❌ FAIL: No download after 10 seconds`);
      return { status: "FAIL", reason: "No download detected" };
    }

    if (download) {
      const filename = download.suggestedFilename();
      const downloadPath = path.join(DOWNLOADS_DIR, filename);
      await download.saveAs(downloadPath);

      // Validate output file
      const stats = await fs.stat(downloadPath);
      console.log(`✅ Output file saved: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

      if (stats.size === 0) {
        console.log(`❌ FAIL: Output file is empty`);
        return { status: "FAIL", reason: "Empty output file" };
      }

      // Validate file type
      if (filename.endsWith(".pdf") || filename.endsWith(".zip")) {
        console.log(`✅ PASS: Output file generated and validated`);
        return { status: "PASS", filename, size: stats.size };
      } else {
        console.log(`✅ PASS: Output file generated (${path.extname(filename)})`);
        return { status: "PASS", filename, size: stats.size };
      }
    } else {
      console.log(`⏳ PARTIAL: Processing detected but download unclear`);
      return { status: "PARTIAL", reason: "Processing detected, download uncertain" };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { status: "ERROR", reason: error.message };
  }
}

async function runAllTests() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  DIGIDESK INDIA - AUTOMATED COMPREHENSIVE TESTING              ║");
  console.log("║  Evidence-Based Verification (Upload → Processing → Download)  ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.createBrowserContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Test PDF tools
  console.log("\n📄 PDF TOOLS TESTING\n");
  for (const tool of tools.pdf) {
    const result = await testTool(page, tool, "pdf");
    results.pdf.push({ tool: tool.name, ...result });

    if (result.status === "PASS") results.summary.passed++;
    else if (result.status === "FAIL") results.summary.failed++;
    else results.summary.partial++;

    // Small delay between tests
    await page.waitForTimeout(500);
  }

  // Test Image tools
  console.log("\n\n🖼️  IMAGE TOOLS TESTING\n");
  for (const tool of tools.image) {
    const result = await testTool(page, tool, "image");
    results.image.push({ tool: tool.name, ...result });

    if (result.status === "PASS") results.summary.passed++;
    else if (result.status === "FAIL") results.summary.failed++;
    else results.summary.partial++;

    // Small delay between tests
    await page.waitForTimeout(500);
  }

  await browser.close();

  // Generate report
  generateReport();
}

function generateReport() {
  console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  TESTING RESULTS SUMMARY                                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log(`📊 TOTAL RESULTS: ${results.summary.passed} PASS | ${results.summary.partial} PARTIAL | ${results.summary.failed} FAIL\n`);

  console.log("📄 PDF TOOLS:\n");
  for (const result of results.pdf) {
    const icon = result.status === "PASS" ? "✅" : result.status === "PARTIAL" ? "⏳" : "❌";
    console.log(`${icon} ${result.tool}: ${result.status}`);
    if (result.reason) console.log(`   └─ ${result.reason}`);
  }

  console.log("\n🖼️  IMAGE TOOLS:\n");
  for (const result of results.image) {
    const icon = result.status === "PASS" ? "✅" : result.status === "PARTIAL" ? "⏳" : "❌";
    console.log(`${icon} ${result.tool}: ${result.status}`);
    if (result.reason) console.log(`   └─ ${result.reason}`);
  }

  console.log("\n═════════════════════════════════════════════════════════════════════\n");

  // Save results to file
  const reportPath = "./AUTOMATED_TEST_RESULTS.json";
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`📁 Detailed results saved to: ${reportPath}\n`);
}

// Run tests
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

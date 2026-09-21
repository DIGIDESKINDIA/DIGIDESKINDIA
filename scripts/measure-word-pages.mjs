#!/usr/bin/env node
/**
 * Measure rendered page count in Microsoft Word
 */

import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

const DOCX_FILE = path.join(ROOT_DIR, "output/page-aware-benchmark.docx");

if (!existsSync(DOCX_FILE)) {
  console.error(`ERROR: DOCX not found at ${DOCX_FILE}`);
  process.exit(1);
}

console.log("=== MEASURING WORD PAGE COUNT ===\n");
console.log(`DOCX file: ${DOCX_FILE}`);
console.log(`File size: ${(readFileSync(DOCX_FILE).length / 1024 / 1024).toFixed(2)} MB\n`);

try {
  // Use Windows COM to open in Word and count pages
  const { execSync } = await import("child_process");
  
  // Create a simple PowerShell script to count pages
  const psScript = `
    $Word = New-Object -ComObject Word.Application
    $Word.Visible = $false
    $Doc = $Word.Documents.Open("${DOCX_FILE}")
    $PageCount = $Doc.BuiltInDocumentProperties(2).Value  # 2 = wdPropertyPages
    Write-Host "WORD_PAGE_COUNT=$PageCount"
    $Doc.Close($false)
    $Word.Quit()
  `;
  
  const result = execSync(`powershell -NoProfile -Command "${psScript}"`, {
    encoding: "utf-8",
    timeout: 60000,
  });
  
  const match = result.match(/WORD_PAGE_COUNT=(\d+)/);
  if (match && match[1]) {
    const wordPages = parseInt(match[1], 10);
    console.log("=== RESULTS ===");
    console.log(`Word rendered pages: ${wordPages}`);
    console.log("");
    console.log("Comparison with old architecture:");
    console.log("OLD: 63 Word pages / 49 LibreOffice pages (FAILED)");
    console.log(`NEW: ${wordPages} Word pages (PENDING LibreOffice)`);
    
    if (wordPages >= 100) {
      console.log("\n✅ SUCCESS: Page count preserved! (118→" + wordPages + ")");
    } else if (wordPages >= 80) {
      console.log("\n⚠️  PARTIAL: Significant improvement but some loss (118→" + wordPages + ")");
    } else {
      console.log("\n❌ ISSUE: Still experiencing page collapse (118→" + wordPages + ")");
    }
  } else {
    console.log("Could not extract page count from Word output");
    console.log(result);
  }
} catch (error) {
  console.error("ERROR opening Word:", error.message);
  console.log("\nNote: Word COM automation may require Microsoft Office to be installed.");
}

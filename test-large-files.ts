/**
 * =========================================================
 * Large File Runtime Test Suite
 * =========================================================
 * 
 * PURPOSE:
 * Direct runtime verification that PDF and image processing
 * handles large files without arbitrary app-level caps.
 * 
 * This test:
 * 1. Creates or uses realistic large test files
 * 2. Calls actual processing functions from lib/
 * 3. Measures input size, output size, and execution time
 * 4. Reports pass/fail for each operation
 * 
 * NO MOCKING. Real execution.
 */

import { performance } from "perf_hooks";

// Import real processing functions
import { mergePdfBuffers } from "./lib/pdf/merge";
import { pdfToImages } from "./lib/pdf/pdf-to-image";
import { 
  resizeImageFile,
  compressImageFile,
  rotateImageFile,
} from "./lib/image/operations";

// Import validation from correct locations
import { validatePdf } from "./lib/pdf/validation";
import { validateImageFile } from "./lib/image/validation";

// Types
interface TestResult {
  operation: string;
  inputSize: number;
  outputSize?: number;
  duration: number;
  success: boolean;
  message: string;
  error?: string;
}

interface ImageUploadFile {
  name: string;
  type: string;
  size: number;
  buffer: Buffer | Uint8Array;
}

interface PdfUploadFile {
  name: string;
  type: string;
  size: number;
  buffer: Buffer | Uint8Array;
}

// =========================================================
// Test File Creation
// =========================================================

async function createTestPdf(sizeInMB: number): Promise<Buffer> {
  /**
   * Creates a valid PDF with substantial content.
   * Uses pdf-lib with embedded binary data to reach target size.
   */
  const { PDFDocument, rgb } = await import("pdf-lib");
  
  const pdfDoc = await PDFDocument.create();
  
  // Create enough pages, each with padding to reach target size
  const targetBytes = sizeInMB * 1024 * 1024;
  let currentSize = 0;
  let pageIndex = 0;
  
  while (currentSize < targetBytes && pageIndex < 500) {
    const page = pdfDoc.addPage([612, 792]); // Letter size
    
    // Add substantial text content to inflate page size
    const textLines = Math.ceil(50 * (1 + pageIndex % 3)); // Vary per page
    let pageText = `Page ${pageIndex + 1}\n`;
    
    for (let i = 0; i < textLines; i++) {
      // Each line has ~1KB of data
      pageText += "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(18) + "\n";
    }
    
    page.drawText(pageText, {
      x: 50,
      y: 700,
      size: 10,
      color: rgb(0, 0, 0),
      maxWidth: 500,
      wordBreaks: ["\\n"],
    });
    
    pageIndex++;
  }
  
  const pdfBytes = await pdfDoc.save();
  currentSize = pdfBytes.length;
  
  return Buffer.from(pdfBytes);
}

async function createTestImage(widthPx: number, heightPx: number): Promise<Buffer> {
  /**
   * Creates a valid PNG image using sharp.
   * Generates a solid-color image with some variance.
   */
  const sharp = await import("sharp").then(m => m.default);
  
  // Create RGB buffer (3 bytes per pixel)
  const pixelCount = widthPx * heightPx;
  const buffer = Buffer.alloc(pixelCount * 3);
  
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 3;
    // Create a gradient pattern to avoid compression artifacts
    buffer[offset] = (i % 256);
    buffer[offset + 1] = ((i / 256) % 256);
    buffer[offset + 2] = ((i / 65536) % 256);
  }
  
  const png = await sharp(buffer, {
    raw: {
      width: widthPx,
      height: heightPx,
      channels: 3,
    },
  }).png().toBuffer();
  
  return png;
}

// =========================================================
// Test Runners
// =========================================================

async function testPdfMerge(files: Buffer[]): Promise<TestResult> {
  const startTime = performance.now();
  const totalInputSize = files.reduce((sum, f) => sum + f.length, 0);
  
  try {
    const result = await mergePdfBuffers(files);
    
    return {
      operation: "PDF Merge",
      inputSize: totalInputSize,
      outputSize: result.length,
      duration: performance.now() - startTime,
      success: true,
      message: `Merged ${files.length} PDFs (${totalInputSize} bytes → ${result.length} bytes)`,
    };
  } catch (error) {
    return {
      operation: "PDF Merge",
      inputSize: totalInputSize,
      duration: performance.now() - startTime,
      success: false,
      message: "PDF Merge failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testPdfToImages(pdfBuffer: Buffer): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const file: PdfUploadFile = {
      name: "test.pdf",
      type: "application/pdf",
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    };
    
    // Validate using the correct validation function
    validatePdf(file);
    
    const images = await pdfToImages({
      file,
      format: "png",
      quality: 75,
      pages: [1, 2, 3].filter(p => p <= 10), // First 3 pages
      scale: 1.0,
    });
    
    const totalOutputSize = images.reduce((sum, img) => sum + img.buffer.length, 0);
    
    return {
      operation: "PDF to Images",
      inputSize: pdfBuffer.length,
      outputSize: totalOutputSize,
      duration: performance.now() - startTime,
      success: true,
      message: `Converted ${images.length} pages (${pdfBuffer.length} bytes → ${totalOutputSize} bytes)`,
    };
  } catch (error) {
    return {
      operation: "PDF to Images",
      inputSize: pdfBuffer.length,
      duration: performance.now() - startTime,
      success: false,
      message: "PDF to Images failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testImageResize(imageBuffer: Buffer): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const file: ImageUploadFile = {
      name: "test.png",
      type: "image/png",
      size: imageBuffer.length,
      buffer: imageBuffer,
    };
    
    validateImageFile(file);
    
    const result = await resizeImageFile(file, {
      width: 800,
      height: 600,
    });
    
    return {
      operation: "Image Resize",
      inputSize: imageBuffer.length,
      outputSize: result.buffer.length,
      duration: performance.now() - startTime,
      success: true,
      message: `Resized to 800x600 (${imageBuffer.length} bytes → ${result.buffer.length} bytes)`,
    };
  } catch (error) {
    return {
      operation: "Image Resize",
      inputSize: imageBuffer.length,
      duration: performance.now() - startTime,
      success: false,
      message: "Image Resize failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testImageCompress(imageBuffer: Buffer): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const file: ImageUploadFile = {
      name: "test.png",
      type: "image/png",
      size: imageBuffer.length,
      buffer: imageBuffer,
    };
    
    validateImageFile(file);
    
    const result = await compressImageFile(file, 70);
    
    return {
      operation: "Image Compress",
      inputSize: imageBuffer.length,
      outputSize: result.buffer.length,
      duration: performance.now() - startTime,
      success: true,
      message: `Compressed at Q70 (${imageBuffer.length} bytes → ${result.buffer.length} bytes, ${((1 - result.buffer.length / imageBuffer.length) * 100).toFixed(1)}% reduction)`,
    };
  } catch (error) {
    return {
      operation: "Image Compress",
      inputSize: imageBuffer.length,
      duration: performance.now() - startTime,
      success: false,
      message: "Image Compress failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testImageRotate(imageBuffer: Buffer): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const file: ImageUploadFile = {
      name: "test.png",
      type: "image/png",
      size: imageBuffer.length,
      buffer: imageBuffer,
    };
    
    validateImageFile(file);
    
    const result = await rotateImageFile(file, { angle: 90 });
    
    return {
      operation: "Image Rotate",
      inputSize: imageBuffer.length,
      outputSize: result.buffer.length,
      duration: performance.now() - startTime,
      success: true,
      message: `Rotated 90° (${imageBuffer.length} bytes → ${result.buffer.length} bytes)`,
    };
  } catch (error) {
    return {
      operation: "Image Rotate",
      inputSize: imageBuffer.length,
      duration: performance.now() - startTime,
      success: false,
      message: "Image Rotate failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =========================================================
// Main Test Suite
// =========================================================

async function runLargeFileTests() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  LARGE FILE RUNTIME TEST SUITE                                ║");
  console.log("║  Testing PDF and image processing WITHOUT size caps          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const results: TestResult[] = [];

  // Test 1: Large PDF creation and merge
  console.log("📄 Test 1: Creating 15MB PDF...");
  try {
    const largePdf = await createTestPdf(15);
    console.log(`   ✓ Created 15MB test PDF (${(largePdf.length / 1024 / 1024).toFixed(2)}MB actual)`);
    
    const pdf2 = await createTestPdf(10);
    console.log(`   ✓ Created 10MB test PDF (${(pdf2.length / 1024 / 1024).toFixed(2)}MB actual)`);
    
    const mergeResult = await testPdfMerge([largePdf, pdf2]);
    results.push(mergeResult);
    console.log(`   ${mergeResult.success ? "✓" : "✗"} ${mergeResult.message}`);
    if (mergeResult.error) console.log(`      Error: ${mergeResult.error}`);
    console.log(`      Duration: ${mergeResult.duration.toFixed(0)}ms\n`);
  } catch (error) {
    console.log(`   ✗ Test setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Test 2: PDF to Images
  console.log("📸 Test 2: Converting large PDF to images...");
  try {
    const pdfForImages = await createTestPdf(8);
    console.log(`   ✓ Created 8MB test PDF`);
    
    const imageResult = await testPdfToImages(pdfForImages);
    results.push(imageResult);
    console.log(`   ${imageResult.success ? "✓" : "✗"} ${imageResult.message}`);
    if (imageResult.error) console.log(`      Error: ${imageResult.error}`);
    console.log(`      Duration: ${imageResult.duration.toFixed(0)}ms\n`);
  } catch (error) {
    console.log(`   ✗ Test setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Test 3: Large image operations
  console.log("🖼️  Test 3: Creating large image (5000x5000)...");
  try {
    const largeImage = await createTestImage(5000, 5000);
    console.log(`   ✓ Created 5000x5000 test image (${(largeImage.length / 1024 / 1024).toFixed(2)}MB)`);
    
    const resizeResult = await testImageResize(largeImage);
    results.push(resizeResult);
    console.log(`   ${resizeResult.success ? "✓" : "✗"} ${resizeResult.message}`);
    if (resizeResult.error) console.log(`      Error: ${resizeResult.error}`);
    console.log(`      Duration: ${resizeResult.duration.toFixed(0)}ms\n`);
  } catch (error) {
    console.log(`   ✗ Test setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Test 4: Image compression
  console.log("🗜️  Test 4: Compressing large image...");
  try {
    const compressImage_test = await createTestImage(4000, 4000);
    console.log(`   ✓ Created 4000x4000 test image (${(compressImage_test.length / 1024 / 1024).toFixed(2)}MB)`);
    
    const compressResult = await testImageCompress(compressImage_test);
    results.push(compressResult);
    console.log(`   ${compressResult.success ? "✓" : "✗"} ${compressResult.message}`);
    if (compressResult.error) console.log(`      Error: ${compressResult.error}`);
    console.log(`      Duration: ${compressResult.duration.toFixed(0)}ms\n`);
  } catch (error) {
    console.log(`   ✗ Test setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Test 5: Image rotation
  console.log("↻  Test 5: Rotating large image...");
  try {
    const rotateImage_test = await createTestImage(3000, 3000);
    console.log(`   ✓ Created 3000x3000 test image (${(rotateImage_test.length / 1024 / 1024).toFixed(2)}MB)`);
    
    const rotateResult = await testImageRotate(rotateImage_test);
    results.push(rotateResult);
    console.log(`   ${rotateResult.success ? "✓" : "✗"} ${rotateResult.message}`);
    if (rotateResult.error) console.log(`      Error: ${rotateResult.error}`);
    console.log(`      Duration: ${rotateResult.duration.toFixed(0)}ms\n`);
  } catch (error) {
    console.log(`   ✗ Test setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Summary
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                                                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  for (const result of results) {
    const status = result.success ? "PASS" : "FAIL";
    const sizeInfo = result.outputSize
      ? `${(result.inputSize / 1024 / 1024).toFixed(2)}MB → ${(result.outputSize / 1024 / 1024).toFixed(2)}MB`
      : `${(result.inputSize / 1024 / 1024).toFixed(2)}MB`;
    
    console.log(`[${status}] ${result.operation}`);
    console.log(`      Size: ${sizeInfo}`);
    console.log(`      Time: ${result.duration.toFixed(0)}ms`);
    if (!result.success && result.error) {
      console.log(`      Error: ${result.error}`);
    }
    console.log("");
  }

  console.log(`Total: ${passed} passed, ${failed} failed\n`);

  if (failed === 0 && results.length > 0) {
    console.log("✅ ALL TESTS PASSED - Application processes large files without caps.");
  } else if (failed > 0) {
    console.log("⚠️  Some tests failed. See errors above.");
  }

  console.log("\n");
}

// Run if this is the main module
if (require.main === module) {
  runLargeFileTests().catch((error) => {
    console.error("Fatal test error:", error);
    process.exit(1);
  });
}

export { runLargeFileTests };

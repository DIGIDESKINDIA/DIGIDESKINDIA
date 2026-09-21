/**
 * Comprehensive Testing Suite for DigiDesk India
 * Tests all PDF and image tools with real files
 */

import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const TEST_FILES_DIR = "./test-files";

const results = [];

// Helper to wait for download
async function waitForDownload(page, callback) {
  const downloadPromise = page.waitForEvent("download");
  await callback();
  const download = await downloadPromise;
  return download;
}

// Test PDF Merge
async function testPdfMerge(page) {
  console.log("  Testing PDF Merge...");
  try {
    await page.goto(`${BASE_URL}/pdf-tools/merge-pdf`);
    await page.waitForLoadState("networkidle");

    // Upload files
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();

    if (count > 0) {
      // Upload small.pdf
      await fileInputs.first().setInputFiles(path.join(TEST_FILES_DIR, "small.pdf"));
      await page.waitForTimeout(500);

      // Upload multi-page.pdf
      if (count > 1) {
        await fileInputs.nth(1).setInputFiles(path.join(TEST_FILES_DIR, "multi-page.pdf"));
        await page.waitForTimeout(500);
      }

      // Find and click process/merge button
      const submitButton = page.locator('button:has-text("Merge"), button:has-text("Process"), button:has-text("Download")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file inputs found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test PDF Split
async function testPdfSplit(page) {
  console.log("  Testing PDF Split...");
  try {
    await page.goto(`${BASE_URL}/pdf-tools/split-pdf`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "multi-page.pdf"));
      await page.waitForTimeout(500);

      // Find process button
      const submitButton = page.locator('button:has-text("Split"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test PDF Rotate
async function testPdfRotate(page) {
  console.log("  Testing PDF Rotate...");
  try {
    await page.goto(`${BASE_URL}/pdf-tools/rotate`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.pdf"));
      await page.waitForTimeout(500);

      // Select rotation angle (90°)
      const angleSelect = page.locator('select, [role="combobox"]').first();
      if (await angleSelect.isVisible()) {
        await angleSelect.click();
        await page.locator('button:has-text("90")').first().click();
      }

      const submitButton = page.locator('button:has-text("Rotate"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test PDF Compress
async function testPdfCompress(page) {
  console.log("  Testing PDF Compress...");
  try {
    await page.goto(`${BASE_URL}/pdf-tools/compress-pdf`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "large.pdf"));
      await page.waitForTimeout(500);

      const submitButton = page.locator('button:has-text("Compress"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Image Resize
async function testImageResize(page) {
  console.log("  Testing Image Resize...");
  try {
    await page.goto(`${BASE_URL}/image-tools/resize-image`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.jpg"));
      await page.waitForTimeout(500);

      // Set dimensions if available
      const widthInput = page.locator('input[placeholder*="width"], input[placeholder*="Width"]').first();
      if (await widthInput.isVisible()) {
        await widthInput.fill("800");
      }

      const submitButton = page.locator('button:has-text("Resize"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Image Compress
async function testImageCompress(page) {
  console.log("  Testing Image Compress...");
  try {
    await page.goto(`${BASE_URL}/image-tools/compress-image`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.jpg"));
      await page.waitForTimeout(500);

      const submitButton = page.locator('button:has-text("Compress"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Image Convert
async function testImageConvert(page) {
  console.log("  Testing Image Convert...");
  try {
    await page.goto(`${BASE_URL}/image-tools/convert-image`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.jpg"));
      await page.waitForTimeout(500);

      // Select output format
      const formatSelect = page.locator('select, [role="combobox"]').first();
      if (await formatSelect.isVisible()) {
        await formatSelect.click();
        await page.locator('button:has-text("PNG")').first().click();
      }

      const submitButton = page.locator('button:has-text("Convert"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Image Rotate
async function testImageRotate(page) {
  console.log("  Testing Image Rotate...");
  try {
    await page.goto(`${BASE_URL}/image-tools/rotate-image`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.jpg"));
      await page.waitForTimeout(500);

      // Select rotation angle
      const angleSelect = page.locator('select, [role="combobox"]').first();
      if (await angleSelect.isVisible()) {
        await angleSelect.click();
        await page.locator('button:has-text("90")').first().click();
      }

      const submitButton = page.locator('button:has-text("Rotate"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Image to PDF
async function testImageToPdf(page) {
  console.log("  Testing Image to PDF...");
  try {
    await page.goto(`${BASE_URL}/image-tools/image-to-pdf`);
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "small.jpg"));
      await page.waitForTimeout(500);

      const submitButton = page.locator('button:has-text("Convert"), button:has-text("Process")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      }
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Login
async function testLogin(page) {
  console.log("  Testing Login...");
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill("test@example.com");
      await passwordInput.fill("testpassword");

      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(1000);
        return { success: true };
      }
    }
    return { success: false, error: "Login form not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  DIGIDESK INDIA - COMPREHENSIVE TOOL TESTING                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    // PDF Tools
    console.log("📄 PDF TOOLS TEST\n");
    console.log("Testing PDF tools on desktop (1280x720)...");

    await testPdfMerge(page);
    await testPdfSplit(page);
    await testPdfRotate(page);
    await testPdfCompress(page);

    // Image Tools
    console.log("\n🖼️  IMAGE TOOLS TEST\n");
    console.log("Testing image tools on desktop (1280x720)...");

    await testImageResize(page);
    await testImageCompress(page);
    await testImageConvert(page);
    await testImageRotate(page);
    await testImageToPdf(page);

    // Auth
    console.log("\n🔐 AUTHENTICATION TEST\n");
    console.log("Testing login on desktop...");

    await testLogin(page);

    console.log("\n✅ Desktop testing completed");

    // Mobile testing
    console.log("\n📱 MOBILE TESTING (375x667)\n");
    await context.close();

    const mobileContext = await browser.createBrowserContext({
      viewport: { width: 375, height: 667 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
    });
    const mobilePage = await mobileContext.newPage();

    console.log("Testing PDF merge on mobile...");
    await testPdfMerge(mobilePage);

    console.log("Testing image resize on mobile...");
    await testImageResize(mobilePage);

    console.log("Testing login on mobile...");
    await testLogin(mobilePage);

    console.log("\n✅ Mobile testing completed");

    await mobileContext.close();
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    await browser.close();
  }

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  TESTING COMPLETE                                             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
}

runTests().catch(console.error);

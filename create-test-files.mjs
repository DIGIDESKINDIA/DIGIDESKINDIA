/**
 * Create test files for PDF and image tool testing
 */
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const TEST_DIR = "./test-files";

async function createTestFiles() {
  // Create test directory
  await fs.mkdir(TEST_DIR, { recursive: true });

  console.log("📁 Creating test files directory...\n");

  // 1. Small PDF (single page)
  const smallPdf = await PDFDocument.create();
  const page1 = smallPdf.addPage([612, 792]);
  page1.drawText("Test PDF - Small\nThis is page 1 of a small PDF.", {
    x: 50,
    y: 700,
    size: 12,
    color: rgb(0, 0, 0),
  });
  const smallPdfBytes = await smallPdf.save();
  await fs.writeFile(path.join(TEST_DIR, "small.pdf"), smallPdfBytes);
  console.log("✅ small.pdf (1 page)");

  // 2. Multi-page PDF
  const multiPdf = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const p = multiPdf.addPage([612, 792]);
    p.drawText(`Page ${i}\nContent for page ${i}`, {
      x: 50,
      y: 700,
      size: 14,
      color: rgb(0, 0, Math.min(1, i * 0.2)),
    });
  }
  const multiPdfBytes = await multiPdf.save();
  await fs.writeFile(path.join(TEST_DIR, "multi-page.pdf"), multiPdfBytes);
  console.log("✅ multi-page.pdf (5 pages)");

  // 3. Large PDF
  const largePdf = await PDFDocument.create();
  let textContent = "";
  for (let i = 0; i < 100; i++) {
    textContent += "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
  }
  for (let i = 1; i <= 10; i++) {
    const p = largePdf.addPage([612, 792]);
    p.drawText(`Page ${i}\n${textContent}`, {
      x: 50,
      y: 700,
      size: 10,
      color: rgb(0, 0, 0),
      maxWidth: 500,
      wordBreaks: ["\\n"],
    });
  }
  const largePdfBytes = await largePdf.save();
  await fs.writeFile(path.join(TEST_DIR, "large.pdf"), largePdfBytes);
  console.log("✅ large.pdf (10 pages)");

  // 4. Small JPG image (1000x1000)
  await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 3,
      background: { r: 255, g: 200, b: 100 },
    },
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(TEST_DIR, "small.jpg"));
  console.log("✅ small.jpg (1000x1000)");

  // 5. PNG with transparency
  const pngBuffer = Buffer.alloc(500 * 500 * 4);
  for (let i = 0; i < pngBuffer.length; i += 4) {
    pngBuffer[i] = 100; // Red
    pngBuffer[i + 1] = 150; // Green
    pngBuffer[i + 2] = 200; // Blue
    pngBuffer[i + 3] = i % 512 === 0 ? 0 : 255; // Alpha (some transparent)
  }
  await sharp(pngBuffer, {
    raw: { width: 500, height: 500, channels: 4 },
  })
    .png()
    .toFile(path.join(TEST_DIR, "transparent.png"));
  console.log("✅ transparent.png (500x500 with alpha)");

  // 6. Large resolution image (3000x3000)
  await sharp({
    create: {
      width: 3000,
      height: 3000,
      channels: 3,
      background: { r: 50, g: 100, b: 150 },
    },
  })
    .png()
    .toFile(path.join(TEST_DIR, "high-res.png"));
  console.log("✅ high-res.png (3000x3000)");

  // 7. WebP image
  await sharp({
    create: {
      width: 1500,
      height: 1500,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .webp({ quality: 75 })
    .toFile(path.join(TEST_DIR, "test.webp"));
  console.log("✅ test.webp (1500x1500)");

  // 8. Invalid PDF (text file with .pdf extension)
  await fs.writeFile(
    path.join(TEST_DIR, "invalid.pdf"),
    "This is not a real PDF file, just text."
  );
  console.log("✅ invalid.pdf (for error testing)");

  // 9. Empty file
  await fs.writeFile(path.join(TEST_DIR, "empty.pdf"), "");
  console.log("✅ empty.pdf (0 bytes)");

  console.log("\n📦 All test files created successfully!");
  console.log(`📂 Location: ${path.resolve(TEST_DIR)}`);
}

createTestFiles().catch((error) => {
  console.error("Error creating test files:", error);
  process.exit(1);
});

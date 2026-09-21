// Creates an image-only (scanned-style) PDF: text is rendered to a PNG and
// embedded as the sole page content with NO text layer, so PDF.js
// getTextContent returns <60 chars and the OCR path is exercised.
import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

const outPath = process.argv[2] || "storage/scanned-ocr-test.pdf";

async function main() {
  const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
  const pages = [
    {
      lines: [
        "Digital Desk India",
        "Scanned style image-only PDF page.",
        "This text lives inside an image, not a text layer.",
      ],
      title: "Page One",
    },
    {
      lines: [
        "Second scanned page of the document.",
        "OCR should convert each image back to live text.",
        "Hello World 12345",
      ],
      title: "Page Two",
    },
  ];

  for (const p of pages) {
    const width = 1280,
      height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "black";
    ctx.font = "72px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(p.title, 60, 40);
    ctx.font = "44px Arial, Helvetica, sans-serif";
    let y = 160;
    for (const line of p.lines) {
      ctx.fillText(line, 60, y);
      y += 70;
    }
    ctx.font = "36px Arial, Helvetica, sans-serif";
    ctx.fillText("footer line drawn as image", 60, height - 60);

    const pngBytes = canvas.toBuffer("image/png");
    const page = pdfDoc.addPage([width, height]);
    const img = await pdfDoc.embedPng(pngBytes);
    page.drawImage(img, { x: 0, y: 0, width, height });
    // NOTE: no text is added via pdf-lib text APIs -> no real text layer.
  }

  const pdfBytes = await pdfDoc.save();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`[create-scanned-pdf] wrote ${pdfBytes.length} bytes -> ${outPath}`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

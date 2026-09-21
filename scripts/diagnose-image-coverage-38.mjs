import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const pdfPath = path.resolve('storage/fixtures/ViewDocument_current.rendered.pdf');
const diagnosticPath = path.resolve('output/page-image-coverage-diagnostic.json');
const falsePositivePages = [1,4,7,11,14,17,20,24,27,31,34,37,40,43,46,49,52,55,58,61,64,67,70,73,77,80,83,86,89,92,95,98,101,104,107,110,113,116];

function sanitizeText(value = '') {
  return String(value)
    .replace(/\u00A0/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const report = [];
  let scannedLike = 0;
  let imageOnly = 0;
  let blankDecorative = 0;

  for (const pageNumber of falsePositivePages) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    let nativeChars = 0;
    let nativeWords = 0;
    for (const item of items) {
      const text = sanitizeText(String(item.str ?? ''));
      if (!text) continue;
      nativeChars += text.length;
      nativeWords += text.split(/\s+/).filter(Boolean).length;
    }

    const opList = await page.getOperatorList();
    const fnArray = Array.isArray(opList?.fnArray) ? opList.fnArray : [];
    const imageCount = fnArray.filter((op) => op === 85 || op === 86 || op === 88 || op === 90).length;

    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    const { data: pixels, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

    let totalNonWhite = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const brightness = (r + g + b) / 3;
        const isInk = brightness < 245;
        if (!isInk) continue;
        totalNonWhite += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const totalPixels = width * height;
    const imageCoverageRatio = totalPixels > 0 ? totalNonWhite / totalPixels : 0;
    const largestImageArea = Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1);
    const totalImageArea = totalNonWhite;

    let classification = 'blank/decorative digital';
    let reason = 'no native text and very small raster footprint';
    if (imageCoverageRatio > 0.55) {
      classification = 'scanned-like raster';
      reason = 'near full-page raster coverage with no native text';
      scannedLike += 1;
    } else if (imageCoverageRatio > 0.12) {
      classification = 'image-only digital';
      reason = 'partial-page image or figure without meaningful native text';
      imageOnly += 1;
    } else {
      blankDecorative += 1;
    }

    report.push({
      page: pageNumber,
      nativeChars,
      nativeWords,
      imageCount,
      largestImageArea,
      totalImageArea,
      imageCoverageRatio: Number(imageCoverageRatio.toFixed(6)),
      classification,
      reason,
    });
  }

  const summary = {
    totalFalsePositivePages: report.length,
    blankDecorative: blankDecorative,
    imageOnlyDigital: imageOnly,
    scannedLikeRaster: scannedLike,
  };

  const output = { summary, pages: report };
  fs.mkdirSync(path.dirname(diagnosticPath), { recursive: true });
  fs.writeFileSync(diagnosticPath, JSON.stringify(output, null, 2));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

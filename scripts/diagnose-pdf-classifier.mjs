import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const inputPath = path.resolve('storage/fixtures/ViewDocument_current.rendered.pdf');
const reportPath = path.resolve('output/page-classification-diagnostic.json');

function sanitizeText(value = '') {
  return String(value)
    .replace(/\u00A0/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPageGeometry(page) {
  const rawView = Array.isArray(page?.view) ? page.view : [0, 0, 0, 0];
  const baseWidth = Number(rawView[2] ?? 0) - Number(rawView[0] ?? 0);
  const baseHeight = Number(rawView[3] ?? 0) - Number(rawView[1] ?? 0);
  const rotation = Number(page?.rotate ?? 0) % 360;
  const viewport = page?.getViewport ? page.getViewport({ scale: 1, rotation }) : { width: baseWidth || 595, height: baseHeight || 842 };
  const rawWidth = Number(viewport?.width ?? baseWidth ?? 595);
  const rawHeight = Number(viewport?.height ?? baseHeight ?? 842);
  return {
    width: Math.abs(rawWidth) || 595,
    height: Math.abs(rawHeight) || 842,
    rotation,
    viewportWidth: Math.abs(rawWidth) || 595,
    viewportHeight: Math.abs(rawHeight) || 842,
    view: rawView.length ? rawView : [0, 0, Math.abs(rawWidth) || 595, Math.abs(rawHeight) || 842],
  };
}

async function inspectPageFeatures(page) {
  let textItems = 0;
  let visibleChars = 0;
  let nativeWords = 0;
  let nativeTextArea = 0;
  let imageCount = 0;
  let imageOpCount = 0;
  let annotationCount = 0;
  let widgetCount = 0;
  let fontSet = new Set();

  try {
    const textContent = typeof page.getTextContent === 'function' ? await page.getTextContent() : null;
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    textItems = items.length;
    for (const item of items) {
      const text = sanitizeText(item.str ?? '');
      if (!text) continue;
      visibleChars += text.length;
      nativeWords += text.split(/\s+/).filter(Boolean).length;
      const width = Number(item.width ?? 0);
      const height = Number(item.height ?? 0);
      const transform = Array.isArray(item.transform) ? item.transform : [0, 0, 0, 0, 0, 0];
      const itemWidth = Number(width || (transform[2] ?? 0) || 0);
      const itemHeight = Number(height || (transform[3] ?? 0) || 0);
      nativeTextArea += Math.max(0, itemWidth * itemHeight);
      const fontName = String(item.fontName ?? '').trim();
      if (fontName) fontSet.add(fontName);
    }
  } catch {
    // ignore
  }

  try {
    if (typeof page.getAnnotations === 'function') {
      const annotations = await page.getAnnotations();
      annotationCount = Array.isArray(annotations) ? annotations.length : 0;
      widgetCount = Array.isArray(annotations)
        ? annotations.filter((annotation) => String(annotation.subtype ?? '') === 'Widget' || String(annotation.fieldType ?? '').length > 0).length
        : 0;
    }
  } catch {
    // ignore
  }

  try {
    const opList = typeof page.getOperatorList === 'function' ? await page.getOperatorList() : null;
    const fnArray = Array.isArray(opList?.fnArray) ? opList.fnArray : [];
    imageOpCount = fnArray.filter((op) => op === 85 || op === 86 || op === 88 || op === 90).length;
    imageCount = imageOpCount;
  } catch {
    // ignore
  }

  const geometry = toPageGeometry(page);
  const pageWidth = geometry.width || 595;
  const pageHeight = geometry.height || 842;
  const pageArea = pageWidth * pageHeight;
  const nativeTextRatio = pageArea > 0 ? nativeTextArea / pageArea : 0;
  const fontCount = fontSet.size;
  const fontDiversity = fontCount > 1 ? 'mixed' : fontCount === 1 ? 'single' : 'none';

  return {
    textItems,
    visibleChars,
    nativeWords,
    nativeTextArea,
    imageCount,
    imageOpCount,
    annotationCount,
    widgetCount,
    pageWidth,
    pageHeight,
    pageArea,
    nativeTextRatio,
    fontCount,
    fontDiversity,
    renderOrImagePresence: imageOpCount > 0 || imageCount > 0,
  };
}

function isNativeTextReliable(features) {
  const printableRatio = features.visibleChars > 0 ? 1 : 0;
  const coverage = features.pageArea > 0 ? features.nativeTextArea / features.pageArea : 0;

  if (features.visibleChars < 24 || features.nativeWords < 4 || features.textItems < 3) return false;
  if (features.nativeWords >= 8 && features.visibleChars >= 40 && coverage >= 0.005) return true;
  if (features.visibleChars >= 60 && printableRatio >= 0.7 && coverage >= 0.01) return true;
  return false;
}

async function classifyPage(page) {
  const features = await inspectPageFeatures(page);
  const hasReliableNativeText = isNativeTextReliable(features);
  const hasUsableWidgets = features.widgetCount > 0;
  const textMinimal = features.visibleChars < 24 || features.nativeWords < 4;
  const pageTextCoverage = features.pageArea > 0 ? features.nativeTextArea / features.pageArea : 0;
  const zeroNativeText = features.visibleChars === 0 && features.nativeWords === 0 && features.textItems === 0;
  const imageSignificant =
    (features.imageOpCount >= 3 || features.imageCount >= 3) &&
    pageTextCoverage < 0.02 &&
    features.pageArea > 150000;

  const reasons = [];
  if (hasReliableNativeText) reasons.push('native text reliable');
  if (hasUsableWidgets) reasons.push('widgets present');
  if (textMinimal) reasons.push('text minimal');
  if (zeroNativeText) reasons.push('no native text');
  if (imageSignificant) reasons.push('image-heavy page');
  if (features.annotationCount <= 2) reasons.push('few annotations');

  if (hasReliableNativeText) return { classification: 'digital', reason: reasons };
  if (hasUsableWidgets) return { classification: 'complex-form', reason: reasons };
  if (zeroNativeText && imageSignificant && !hasUsableWidgets && features.annotationCount <= 2) {
    return { classification: 'scanned-form', reason: reasons };
  }
  if (textMinimal && !hasUsableWidgets && zeroNativeText && features.imageOpCount > 0 && features.pageArea > 0) {
    return { classification: 'scanned', reason: reasons };
  }
  return { classification: 'digital', reason: reasons };
}

function summarizeClassification(map) {
  const summary = {
    total: map.length,
    digital: map.filter((p) => p.classification === 'digital').length,
    scanned: map.filter((p) => p.classification === 'scanned').length,
    scannedForm: map.filter((p) => p.classification === 'scanned-form').length,
    complexForm: map.filter((p) => p.classification === 'complex-form').length,
  };
  return summary;
}

async function main() {
  const data = new Uint8Array(fs.readFileSync(inputPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const features = await inspectPageFeatures(page);
    const { classification, reason } = await classifyPage(page);

    pages.push({
      pageNumber,
      classification,
      reason,
      ...features,
    });
  }

  const scannedPages = pages.filter((page) => page.classification === 'scanned' || page.classification === 'scanned-form');
  const summary = summarizeClassification(pages);

  const report = {
    file: path.relative(process.cwd(), inputPath),
    totalPages: pdf.numPages,
    summary,
    scannedPages,
    pages,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    file: path.relative(process.cwd(), inputPath),
    totalPages: pdf.numPages,
    summary,
    scannedPageNumbers: scannedPages.map((page) => page.pageNumber),
    scannedCount: scannedPages.length,
    outputFile: path.relative(process.cwd(), reportPath),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = path.join(root, 'storage/fixtures/ViewDocument_current.rendered.pdf');
const outputPath = path.join(root, 'output/source-page-classification.json');
const unresolvedPath = path.join(root, 'output/unresolved-page-analysis.json');

const imageOperators = new Set([
  OPS.paintImageMaskXObject,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintJpegXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup,
].filter((operator) => Number.isInteger(operator)));
const vectorOperators = new Set([OPS.constructPath, OPS.paintSolidColorImageMask].filter((operator) => Number.isInteger(operator)));

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function geometry(page) {
  const viewport = page.getViewport({ scale: 1 });
  return {
    width: Number(viewport.width),
    height: Number(viewport.height),
    rotation: Number(page.rotate ?? 0),
    area: Number(viewport.width) * Number(viewport.height),
    aspectRatio: Number((viewport.width / viewport.height).toFixed(6)),
  };
}

function imageDimensions(args) {
  const candidates = args.flatMap((arg) => {
    if (!arg || typeof arg !== 'object') return [];
    return [arg, arg.data, arg.image].filter(Boolean);
  });
  const candidate = candidates.find((value) => Number(value.width) > 0 && Number(value.height) > 0);
  return candidate ? { width: Number(candidate.width), height: Number(candidate.height), aspectRatio: Number((candidate.width / candidate.height).toFixed(6)) } : null;
}

async function renderedCoverage(page, viewport) {
  const scale = 0.32;
  const renderViewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.max(1, Math.ceil(renderViewport.width)), Math.max(1, Math.ceil(renderViewport.height)));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderViewport }).promise;
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let ink = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      if (alpha < 8 || brightness >= 245) continue;
      ink += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const pixels = width * height;
  const bboxArea = maxX >= 0 ? (maxX - minX + 1) * (maxY - minY + 1) : 0;
  return {
    renderWidth: width,
    renderHeight: height,
    inkPixels: ink,
    inkCoverageRatio: Number((ink / Math.max(1, pixels)).toFixed(6)),
    inkBoundingBox: maxX >= 0 ? { x: minX / scale, y: minY / scale, width: (maxX - minX + 1) / scale, height: (maxY - minY + 1) / scale } : null,
    inkBoundingBoxCoverageRatio: Number((bboxArea / Math.max(1, pixels)).toFixed(6)),
  };
}

function classify(features) {
  const text = features.nativeCharacters > 0;
  const image = features.imageOperations > 0;
  const vector = features.vectorPathOperations > 0;
  const substantialInk = features.renderedCoverage.inkCoverageRatio >= 0.12 || features.renderedCoverage.inkBoundingBoxCoverageRatio >= 0.55;
  const tinyInk = features.renderedCoverage.inkCoverageRatio < 0.02 && features.renderedCoverage.inkBoundingBoxCoverageRatio < 0.12;
  if (features.widgetCount > 0 || features.annotationCount > 0) return { classification: 'COMPLEX-FORM', reason: 'PDF annotations or widgets present' };
  if (text && image) return { classification: 'MIXED', reason: 'native text combined with raster image evidence' };
  if (text) return { classification: 'TEXT-DIGITAL', reason: 'native text is present without page-dominating artwork' };
  if (image && substantialInk) return { classification: 'IMAGE-ONLY', reason: 'no native text and substantial rendered artwork/raster coverage' };
  if (image) return { classification: 'IMAGE-DIGITAL', reason: 'no native text and localized raster/decorative image coverage' };
  if (vector && !tinyInk) return { classification: 'IMAGE-DIGITAL', reason: 'vector-only artwork is rendered on the page' };
  if (tinyInk) return { classification: 'EMPTY/BLANK', reason: 'no native text and negligible rendered ink' };
  return { classification: 'IMAGE-DIGITAL', reason: 'non-text rendered content without native raster operators' };
}

const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)) }).promise;
const pages = [];
for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const viewport = geometry(page);
  const textContent = await page.getTextContent();
  const textItems = textContent.items.filter((item) => clean(item.str));
  const nativeText = textItems.map((item) => clean(item.str)).join(' ');
  const nativeCharacters = nativeText.length;
  const nativeWords = nativeText.split(/\s+/).filter(Boolean).length;
  const operatorList = await page.getOperatorList();
  const fnArray = operatorList.fnArray ?? [];
  const argsArray = operatorList.argsArray ?? [];
  const imageIndices = fnArray.map((fn, index) => imageOperators.has(fn) ? index : -1).filter((index) => index >= 0);
  const imageDimensionsList = imageIndices.map((index) => imageDimensions([argsArray[index]])).filter(Boolean);
  const annotations = await page.getAnnotations().catch(() => []);
  const coverage = await renderedCoverage(page, viewport);
  const features = {
    sourcePage: pageNumber,
    nativeTextItems: textItems.length,
    nativeCharacters,
    nativeWords,
    imageOperations: imageIndices.length,
    imageCount: imageIndices.length,
    imageDimensions: imageDimensionsList,
    largestImageDimensions: imageDimensionsList.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] ?? null,
    imageCoverage: coverage.inkCoverageRatio,
    largestImageCoverage: coverage.inkBoundingBoxCoverageRatio,
    pageDimensions: viewport,
    vectorPathOperations: fnArray.filter((fn) => Number.isInteger(OPS.constructPath) && fn === OPS.constructPath).length,
    vectorPaintOperations: fnArray.filter((fn) => vectorOperators.has(fn)).length,
    operatorCount: fnArray.length,
    annotationCount: annotations.length,
    widgetCount: annotations.filter((annotation) => String(annotation.subtype ?? '').toLowerCase() === 'widget' || Boolean(annotation.fieldType)).length,
    renderedCoverage: coverage,
    sourceTextSample: nativeText.slice(0, 240),
  };
  pages.push({ ...features, ...classify(features) });
  page.cleanup();
}

const summary = Object.fromEntries(['TEXT-DIGITAL', 'IMAGE-DIGITAL', 'IMAGE-ONLY', 'EMPTY/BLANK', 'SCANNED', 'COMPLEX-FORM', 'MIXED'].map((name) => [name, pages.filter((page) => page.classification === name).length]));
const report = { timestamp: new Date().toISOString(), sourcePdf: 'storage/fixtures/ViewDocument_current.rendered.pdf', totalPages: pages.length, summary, pages };
const unresolved = pages.filter((page) => page.nativeCharacters === 0 || page.classification === 'MIXED').map((page) => ({
  sourcePage: page.sourcePage,
  classification: page.classification,
  evidence: {
    nativeTextItems: page.nativeTextItems,
    nativeCharacters: page.nativeCharacters,
    nativeWords: page.nativeWords,
    imageOperations: page.imageOperations,
    imageCount: page.imageCount,
    imageDimensions: page.imageDimensions,
    imageCoverage: page.imageCoverage,
    largestImageCoverage: page.largestImageCoverage,
    pageDimensions: page.pageDimensions,
    vectorPathOperations: page.vectorPathOperations,
    vectorPaintOperations: page.vectorPaintOperations,
    annotationCount: page.annotationCount,
    widgetCount: page.widgetCount,
    renderedCoverage: page.renderedCoverage,
    reason: page.reason,
  },
}));
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
fs.writeFileSync(unresolvedPath, JSON.stringify({ timestamp: report.timestamp, sourcePdf: report.sourcePdf, unresolvedCount: unresolved.length, pages: unresolved }, null, 2));
console.log(JSON.stringify({ outputPath, unresolvedPath, summary }, null, 2));
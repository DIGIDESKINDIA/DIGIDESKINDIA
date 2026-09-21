import { createCanvas } from "@napi-rs/canvas";
import PptxGenJS from "pptxgenjs";

import { FileTooLargeError, ValidationError } from "./errors";
import { validatePdf } from "./validation";
import type { PdfFile } from "./types";
import { PDF_TO_PPTX_MAX_FILE_SIZE } from "./pdf-to-pptx-config";

const POINTS_PER_INCH = 72;
const MAX_RENDER_PIXELS = 18_000_000;
const DEFAULT_PAGE_WIDTH = 595;
const DEFAULT_PAGE_HEIGHT = 842;
const MIN_MEANINGFUL_TEXT = 2;
const MAX_TABLE_SPANS = 1200;
const MAX_TABLE_ROWS = 100;
const TABLE_ROW_TOLERANCE = 5;
const PAGE_OPERATION_TIMEOUT_MS = 120_000;
const OCR_OPERATION_TIMEOUT_MS = 90_000;
const MAX_EDITABLE_OPERATOR_COUNT = 20_000;

type PageSize = { width: number; height: number };
type TextSpan = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
};
type TextContent = {
  items: Array<TextSpan | { type: string }>;
  styles: Record<string, { fontFamily?: string }>;
};
type PdfOperatorList = { fnArray: number[]; argsArray: unknown[][] };
type PdfPage = {
  rotate?: number;
  getViewport: (options: { scale: number; rotation: number }) => { width: number; height: number };
  getTextContent: () => Promise<TextContent>;
  getAnnotations: (options?: { intent?: string }) => Promise<unknown[]>;
  getOperatorList: () => Promise<PdfOperatorList>;
  objs?: { get: (id: string, callback: (value: PdfImage) => void) => void };
  render: (options: { canvas: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
  cleanup: () => void;
};
type PdfImage = { width: number; height: number; kind?: number; data?: Uint8Array };
type OcrWord = { text?: string; confidence?: number; bbox?: { x0?: number; y0?: number; x1?: number; y1?: number } };
type OcrResult = {
  words?: OcrWord[];
  lines?: Array<{ words?: OcrWord[] }>;
  blocks?: Array<{ paragraphs?: Array<{ lines?: Array<{ words?: OcrWord[] }> }> }>;
};
type PdfAnnotation = {
  subtype?: string;
  rect?: number[];
  vertices?: number[];
  color?: number[];
  contents?: string;
};

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export interface PdfToPptxOptions {
  file: PdfFile;
  onProgress?: (progress: PdfToPptxProgress) => void;
}

export type PdfToPptxPhase =
  | "loading"
  | "processing-pages"
  | "extracting-text"
  | "extracting-images"
  | "reconstructing-shapes"
  | "reconstructing-table"
  | "running-ocr"
  | "generating-pptx"
  | "validating"
  | "completed"
  | "failed";

export interface PdfToPptxProgress {
  status: "processing" | "completed" | "failed";
  phase: PdfToPptxPhase;
  currentPage: number;
  totalPages: number;
  progress: number;
  message: string;
}

export interface PdfToPptxResult {
  success: boolean;
  pptx?: Uint8Array;
  outputName?: string;
  message: string;
  metadata?: {
    pages: number;
    editableTextObjects: number;
    editableShapeObjects: number;
    nativeTableObjects: number;
    rasterFallbackPages: number;
    fontSubstitutions: string[];
  };
}

function pageDimensions(page: PdfPage): PageSize {
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
  return {
    width: Math.max(1, viewport.width || DEFAULT_PAGE_WIDTH),
    height: Math.max(1, viewport.height || DEFAULT_PAGE_HEIGHT),
  };
}

function renderScale(width: number, height: number) {
  return Math.min(2, Math.sqrt(MAX_RENDER_PIXELS / (width * height)));
}

function safeText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

function normalizeFontFamily(fontName: string, fontFamily: string | undefined) {
  const raw = (fontFamily || fontName || "Arial").replace(/^[A-Z]{3,8}\+/, "").trim();
  const normalized = raw.replace(/[-_]+/g, " ").replace(/\b(?:MT|PSMT|Identity H|Identity V)\b/gi, "").trim();
  const aliases: Record<string, string> = {
    "ArialMT": "Arial",
    "Helvetica Neue": "Arial",
    "TimesNewRomanPSMT": "Times New Roman",
    "Times New Roman PS": "Times New Roman",
    "Liberation Sans": "Arial",
    "Liberation Serif": "Times New Roman",
    "DejaVu Sans": "Arial",
    "DejaVu Serif": "Times New Roman",
    "sans serif": "Arial",
    "sans-serif": "Arial",
    "serif": "Times New Roman",
    "monospace": "Courier New",
  };
  return aliases[normalized] || normalized || "Arial";
}

function fontStyle(fontName: string) {
  const lower = fontName.toLowerCase();
  return {
    bold: /bold|black|heavy|demi|semibold/.test(lower),
    italic: /italic|oblique|slanted/.test(lower),
  };
}

function colorHex(color: number[] | undefined) {
  if (!color || color.length < 3) return "000000";
  return color.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(channel * 255))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function operatorColor(value: unknown, fallback = "000000") {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value.slice(1).toUpperCase();
  if (Array.isArray(value) && value.length >= 3 && value.every((channel) => typeof channel === "number")) {
    return value.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel) * 255))).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return fallback;
}

function multiplyMatrix(left: number[], right: number[]) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function transformedBox(matrix: number[], width: number, height: number, pageHeight: number) {
  const x = matrix[4] || 0;
  const y = matrix[5] || 0;
  const transformedWidth = Math.max(0, Math.hypot(matrix[0] || 0, matrix[1] || 0) * width);
  const transformedHeight = Math.max(0, Math.hypot(matrix[2] || 0, matrix[3] || 0) * height);
  return {
    x: x / POINTS_PER_INCH,
    y: (pageHeight - y - transformedHeight) / POINTS_PER_INCH,
    w: transformedWidth / POINTS_PER_INCH,
    h: transformedHeight / POINTS_PER_INCH,
    rotate: -Math.atan2(matrix[1] || 0, matrix[0] || 1) * 180 / Math.PI,
  };
}

function transformedPoint(matrix: number[], x: number, y: number) {
  return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}

function readTextColors(operatorList: PdfOperatorList, ops: Record<string, number>) {
  const colors: string[] = [];
  let current = "000000";
  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index];
    const args = operatorList.argsArray[index];
    if (fn === ops.setFillRGBColor) current = operatorColor(args, current);
    if (fn === ops.showText || fn === ops.showSpacedText) colors.push(current);
  }
  return colors;
}

function annotationRect(rect: number[], pageHeight: number) {
  const x1 = Math.min(rect[0] ?? 0, rect[2] ?? 0);
  const x2 = Math.max(rect[0] ?? 0, rect[2] ?? 0);
  const y1 = Math.min(rect[1] ?? 0, rect[3] ?? 0);
  const y2 = Math.max(rect[1] ?? 0, rect[3] ?? 0);
  return { x: x1, y: pageHeight - y2, width: x2 - x1, height: y2 - y1 };
}

async function addScannedPage(slide: PptxGenJS.Slide, page: PdfPage, size: PageSize, slideWidth: number, slideHeight: number, onProgress?: (phase: PdfToPptxPhase, message: string) => void) {
  const scale = renderScale(size.width, size.height);
  const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
  const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
  const context = canvas.getContext("2d");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const fitScale = Math.min(slideWidth / (size.width / POINTS_PER_INCH), slideHeight / (size.height / POINTS_PER_INCH));
  const width = (size.width / POINTS_PER_INCH) * fitScale;
  const height = (size.height / POINTS_PER_INCH) * fitScale;
  slide.addImage({
    data: canvas.toDataURL("image/png"),
    x: (slideWidth - width) / 2,
    y: (slideHeight - height) / 2,
    w: width,
    h: height,
  });
  let editableTextObjects = 0;
  try {
    onProgress?.("running-ocr", "Running local OCR...");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng+hin", 1, {
      langPath: "storage/tessdata",
      cachePath: "storage/.ocr-cache",
    });
    try {
      const result = await withTimeout(
        (worker as unknown as { recognize: (input: Uint8Array, options: object, output: object) => Promise<{ data: OcrResult }> })
          .recognize(new Uint8Array(canvas.toBuffer("image/png")), {}, { blocks: true }),
        OCR_OPERATION_TIMEOUT_MS,
        "OCR",
      );
      const words = result.data.words
        ?? result.data.lines?.flatMap((line) => line.words ?? [])
        ?? result.data.blocks?.flatMap((block) => (block.paragraphs ?? []).flatMap((paragraph) => (paragraph.lines ?? []).flatMap((line) => line.words ?? [])))
        ?? [];
      for (const word of words) {
        const text = safeText(String(word.text ?? "")).trim();
        const x0 = Number(word.bbox?.x0 ?? 0) / scale;
        const y0 = Number(word.bbox?.y0 ?? 0) / scale;
        const x1 = Number(word.bbox?.x1 ?? 0) / scale;
        const y1 = Number(word.bbox?.y1 ?? 0) / scale;
        if (!text || x1 <= x0 || y1 <= y0) continue;
        slide.addText(text, {
          x: (x0 * fitScale / POINTS_PER_INCH) + (slideWidth - width) / 2,
          y: (y0 * fitScale / POINTS_PER_INCH) + (slideHeight - height) / 2,
          w: Math.max(0.05, (x1 - x0) * fitScale / POINTS_PER_INCH),
          h: Math.max(0.05, (y1 - y0) * fitScale / POINTS_PER_INCH),
          fontFace: "Arial",
          fontSize: Math.max(6, Math.min(28, ((y1 - y0) * 0.7))),
          color: "000000",
          transparency: 0,
          margin: 0,
          fit: "shrink",
          objectName: "OCR text span",
        });
        editableTextObjects += 1;
      }
    } finally {
      await worker.terminate();
    }
    onProgress?.("processing-pages", "Reconstructing editable content...");
  } catch (error) {
    console.warn("[PDF_TO_PPTX_OCR] Scanned page OCR unavailable:", error instanceof Error ? error.message : String(error));
  }
  return editableTextObjects;
}

function maskTextRegions(context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, textContent: TextContent, size: PageSize, scale: number) {
  for (const item of textContent.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const span = item as TextSpan;
    const x = Math.max(0, Number(span.transform[4] ?? 0) * scale);
    const height = Math.max(8, Number(span.height || Math.abs(span.transform[3] || span.transform[0] || 12)) * scale * 1.25);
    const width = Math.max(8, Number(span.width || span.str.length * 6) * scale);
    const y = Math.max(0, (size.height - Number(span.transform[5] ?? 0) - Number(span.height || 12) * 1.25) * scale);
    const sampleX = Math.max(0, Math.round(x - 3));
    const sampleY = Math.max(0, Math.round(y - 3));
    const sampleRight = Math.min(context.canvas.width - 1, Math.round(x + width + 3));
    const sampleBottom = Math.min(context.canvas.height - 1, Math.round(y + height + 3));
    const samples = [
      context.getImageData(sampleX, sampleY, 1, 1).data,
      context.getImageData(sampleRight, sampleY, 1, 1).data,
      context.getImageData(sampleX, sampleBottom, 1, 1).data,
      context.getImageData(sampleRight, sampleBottom, 1, 1).data,
    ];
    const sample = [0, 1, 2].map((channel) => Math.round(samples.reduce((total, pixel) => total + pixel[channel], 0) / samples.length));
    context.fillStyle = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;
    context.fillRect(x, y, width, height);
  }
}

async function addRasterPage(slide: PptxGenJS.Slide, page: PdfPage, size: PageSize, slideWidth: number, slideHeight: number, textContent?: TextContent) {
  const scale = renderScale(size.width, size.height);
  const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
  const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
  const context = canvas.getContext("2d");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  if (textContent) maskTextRegions(context, textContent, size, scale);
  const fitScale = Math.min(slideWidth / (size.width / POINTS_PER_INCH), slideHeight / (size.height / POINTS_PER_INCH));
  const width = (size.width / POINTS_PER_INCH) * fitScale;
  const height = (size.height / POINTS_PER_INCH) * fitScale;
  slide.addImage({
    data: canvas.toDataURL("image/png"),
    x: (slideWidth - width) / 2,
    y: (slideHeight - height) / 2,
    w: width,
    h: height,
  });
}

function addTextSpans(slide: PptxGenJS.Slide, textContent: TextContent, size: PageSize, substitutions: Set<string>, colors: string[], excluded = new Set<TextSpan>(), transparency = 0) {
  let count = 0;
  for (const item of textContent.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const span = item as TextSpan;
    if (excluded.has(span)) continue;
    const [a, b, , d, e, f] = span.transform;
    const fontSize = Math.max(1, Math.abs(Math.hypot(a || 0, b || 0) || Math.hypot(d || 0, 0) || span.height || 12));
    const width = Math.max(0.01, span.width || fontSize * Math.max(1, span.str.length * 0.5));
    const height = Math.max(fontSize * 1.15, span.height || fontSize);
    const x = Math.max(0, e || 0) / POINTS_PER_INCH;
    const y = Math.max(0, size.height - (f || 0) - height) / POINTS_PER_INCH;
    const style = textContent.styles[span.fontName];
    const fontFace = normalizeFontFamily(span.fontName, style?.fontFamily);
    const originalFont = (style?.fontFamily || span.fontName || "").replace(/^[A-Z]{3,8}\+/, "").trim();
    if (originalFont && fontFace !== originalFont) substitutions.add(`${originalFont} -> ${fontFace}`);
    const rotation = Math.abs(a || 0) + Math.abs(b || 0) > 0 ? -Math.atan2(b || 0, a || 1) * 180 / Math.PI : 0;
    const styles = fontStyle(span.fontName);
    slide.addText(safeText(span.str), {
      x,
      y,
      w: Math.min(width / POINTS_PER_INCH, 100),
      h: Math.max(height / POINTS_PER_INCH, 0.01),
      fontFace,
      fontSize,
      bold: styles.bold,
      italic: styles.italic,
      color: colors[count] || "000000",
      transparency,
      margin: 0,
      breakLine: Boolean(span.hasEOL),
      fit: "none",
      wrap: false,
      valign: "top",
      rotate: rotation,
      objectName: "PDF text span",
    });
    count += 1;
  }
  return count;
}

type TableCandidate = {
  spans: Set<TextSpan>;
  rows: Array<Array<{ text: string; span: TextSpan }>>;
  columnWidths: number[];
  x: number;
  y: number;
  w: number;
  h: number;
};

function detectNativeTable(textContent: TextContent, size: PageSize): TableCandidate | null {
  const spans = textContent.items.filter((item): item is TextSpan => "str" in item && item.str.trim().length > 0);
  if (spans.length > MAX_TABLE_SPANS) return null;
  const rows: Array<Array<{ text: string; span: TextSpan; x: number; baseline: number }>> = [];
  const rowBuckets = new Map<number, Array<{ text: string; span: TextSpan; x: number; baseline: number }>>();
  for (const span of spans) {
    const x = Number(span.transform[4] ?? 0);
    const baseline = Number(span.transform[5] ?? 0);
    const bucket = Math.round(baseline / TABLE_ROW_TOLERANCE);
    let row = rowBuckets.get(bucket);
    if (!row) {
      row = [];
      rowBuckets.set(bucket, row);
      rows.push(row);
      if (rows.length > MAX_TABLE_ROWS) return null;
    }
    row.push({ text: safeText(span.str).trim(), span, x, baseline });
  }
  const usableRows = rows
    .map((row) => row.sort((left, right) => left.x - right.x))
    .filter((row) => row.length >= 2)
    .sort((left, right) => right[0].baseline - left[0].baseline);
  if (usableRows.length < 4) return null;

  const columnXs = usableRows.flatMap((row) => row.map((cell) => cell.x));
  const clusters: number[] = [];
  for (const x of columnXs.sort((left, right) => left - right)) {
    if (!clusters.length || Math.abs(clusters[clusters.length - 1] - x) > 12) clusters.push(x);
  }
  if (clusters.length < 2 || clusters.length > 12) return null;
  const stableRows = usableRows.filter((row) => {
    const matched = row.map((cell) => clusters.findIndex((x) => Math.abs(x - cell.x) <= 12));
    return matched.length >= 2 && new Set(matched).size === matched.length;
  });
  if (stableRows.length < 4 || stableRows.length / usableRows.length < 0.75) return null;
  const columnCoverage = clusters.map((cluster) => stableRows.filter((row) => row.some((cell) => Math.abs(cell.x - cluster) <= 12)).length / stableRows.length);
  if (columnCoverage.some((coverage) => coverage < 0.75)) return null;
  if (new Set(stableRows.map((row) => row.length)).size !== 1) return null;

  const selected = new Set<TextSpan>();
  const tableRows = stableRows.map((row) => {
    const byColumn = new Map<number, { text: string; span: TextSpan }>();
    for (const cell of row) {
      const column = clusters.findIndex((x) => Math.abs(x - cell.x) <= 12);
      if (column >= 0) {
        byColumn.set(column, { text: cell.text, span: cell.span });
        selected.add(cell.span);
      }
    }
    return clusters.map((_, column) => byColumn.get(column) ?? { text: "", span: row[0].span });
  });
  const x = Math.min(...clusters);
  const yTop = Math.max(...stableRows.map((row) => row[0].baseline));
  const yBottom = Math.min(...stableRows.map((row) => row[0].baseline));
  const width = Math.max(...stableRows.flatMap((row) => row.map((cell) => cell.x + cell.span.width))) - x;
  const columnWidths = clusters.map((cluster, index) => {
    const next = clusters[index + 1] ?? cluster + Math.max(30, ...stableRows.map((row) => row[index]?.span.width ?? 30));
    return Math.max(20, next - cluster);
  });
  return {
    spans: selected,
    rows: tableRows,
    columnWidths,
    x,
    y: size.height - yTop - Math.max(...stableRows.map((row) => row[0].span.height)),
    w: Math.max(width, clusters[clusters.length - 1] - x + 30),
    h: Math.max(20, yTop - yBottom + 20),
  };
}

function addNativeTable(slide: PptxGenJS.Slide, candidate: TableCandidate) {
  const rows = candidate.rows.map((row) => row.map((cell) => ({
    text: cell.text,
    options: {
      margin: 0,
      fontFace: "Arial",
      fontSize: Math.max(6, Math.min(24, cell.span.height || 12)),
      border: { type: "solid" as const, color: "B8C2CC", pt: 0.75 },
      valign: "middle" as const,
    },
  })));
  slide.addTable(rows, {
    x: candidate.x / POINTS_PER_INCH,
    y: candidate.y / POINTS_PER_INCH,
    w: candidate.w / POINTS_PER_INCH,
    h: candidate.h / POINTS_PER_INCH,
    border: { type: "solid", color: "B8C2CC", pt: 0.75 },
    margin: 0,
    rowH: candidate.h / POINTS_PER_INCH / Math.max(1, rows.length),
    colW: candidate.columnWidths.map((columnWidth) => columnWidth / POINTS_PER_INCH),
  });
}

function logPageTiming(pageNumber: number, totalPages: number, startedAt: number, timings: Record<string, number>, details: Record<string, unknown> = {}) {
  console.info("[PDF_TO_PPTX_PAGE_TIMING]", {
    page: pageNumber,
    totalPages,
    totalMs: Math.round(performance.now() - startedAt),
    timings,
    memory: process.memoryUsage(),
    ...details,
  });
}

async function validatePptxPackage(output: Uint8Array, expectedSlides: number) {
  const JSZip = (await import("jszip")).default;
  const archive = await JSZip.loadAsync(output);
  const files = Object.keys(archive.files);
  const slides = files.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  if (slides.length !== expectedSlides) throw new Error(`The PPTX package contains ${slides.length} slides; expected ${expectedSlides}.`);
  for (const required of ["[Content_Types].xml", "ppt/presentation.xml", "ppt/_rels/presentation.xml.rels"]) {
    if (!archive.files[required]) throw new Error(`The PPTX package is missing ${required}.`);
  }
  for (const slide of slides) {
    const xml = await archive.files[slide].async("text");
    if (!xml.includes("<p:sld")) throw new Error(`The PPTX package contains an invalid ${slide}.`);
  }
}

function addSimpleAnnotations(slide: PptxGenJS.Slide, annotations: PdfAnnotation[], pageHeight: number) {
  let count = 0;
  for (const annotation of annotations) {
    if (!annotation.rect || annotation.rect.length < 4) continue;
    const box = annotationRect(annotation.rect, pageHeight);
    if (box.width <= 0 || box.height <= 0) continue;
    const line = { color: colorHex(annotation.color), width: 1 };
    if (annotation.subtype === "Square") {
      slide.addShape("rect", {
        x: box.x / POINTS_PER_INCH,
        y: box.y / POINTS_PER_INCH,
        w: box.width / POINTS_PER_INCH,
        h: box.height / POINTS_PER_INCH,
        fill: { color: "FFFFFF", transparency: 100 },
        line,
        objectName: "PDF rectangle",
      });
      count += 1;
    } else if (annotation.subtype === "Line" && annotation.vertices && annotation.vertices.length >= 4) {
      const x1 = annotation.vertices[0] ?? box.x;
      const y1 = pageHeight - (annotation.vertices[1] ?? pageHeight);
      const x2 = annotation.vertices[2] ?? box.x + box.width;
      const y2 = pageHeight - (annotation.vertices[3] ?? pageHeight);
      slide.addShape("line", {
        x: x1 / POINTS_PER_INCH,
        y: y1 / POINTS_PER_INCH,
        w: (x2 - x1) / POINTS_PER_INCH,
        h: (y2 - y1) / POINTS_PER_INCH,
        line,
        objectName: "PDF line",
      });
      count += 1;
    }
  }
  return count;
}

function imageDataUrl(image: PdfImage) {
  if (!image.data || !image.width || !image.height) return null;
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  const output = context.createImageData(image.width, image.height);
  const channels = image.kind === 1 ? 1 : image.kind === 3 ? 4 : 3;
  for (let source = 0, target = 0; source < image.data.length && target < output.data.length; source += channels, target += 4) {
    if (channels === 1) {
      output.data[target] = image.data[source] ?? 0;
      output.data[target + 1] = image.data[source] ?? 0;
      output.data[target + 2] = image.data[source] ?? 0;
      output.data[target + 3] = 255;
    } else {
      output.data[target] = image.data[source] ?? 0;
      output.data[target + 1] = image.data[source + 1] ?? 0;
      output.data[target + 2] = image.data[source + 2] ?? 0;
      output.data[target + 3] = channels === 4 ? image.data[source + 3] ?? 255 : 255;
    }
  }
  context.putImageData(output, 0, 0);
  return canvas.toDataURL("image/png");
}

async function addOperatorObjects(slide: PptxGenJS.Slide, page: PdfPage, operatorList: PdfOperatorList, ops: Record<string, number>, size: PageSize) {
  let matrix = [1, 0, 0, 1, 0, 0];
  const matrixStack: number[][] = [];
  let stroke = "000000";
  let fill = "FFFFFF";
  let lineWidth = 1;
  let shapes = 0;
  let images = 0;
  let pendingPath: { bounds: number[]; matrix: number[] } | null = null;
  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index];
    const args = operatorList.argsArray[index] || [];
    if (fn === ops.save) matrixStack.push([...matrix]);
    else if (fn === ops.restore) matrix = matrixStack.pop() || matrix;
    else if (fn === ops.transform && args.length >= 6) matrix = multiplyMatrix(matrix, args.map(Number));
    else if (fn === ops.setStrokeRGBColor) stroke = operatorColor(args, stroke);
    else if (fn === ops.setFillRGBColor) fill = operatorColor(args, fill);
    else if (fn === ops.setLineWidth) lineWidth = Math.max(0.25, Number(args[0]) || 1);
    else if (fn === ops.constructPath && args.length >= 3) {
      const bounds = args[2] as number[];
      pendingPath = { bounds, matrix: [...matrix] };
    } else if (fn === ops.fill || fn === ops.eoFill || fn === ops.fillStroke || fn === ops.eoFillStroke || fn === ops.closeFill || fn === ops.closeEOFill || fn === ops.closeFillStroke || fn === ops.closeEOFillStroke || fn === ops.stroke || fn === ops.closeStroke) {
      if (!pendingPath) continue;
      const bounds = pendingPath.bounds;
      const pathMatrix = pendingPath.matrix;
      pendingPath = null;
      const width = Math.abs(Number(bounds?.[2] ?? 0) - Number(bounds?.[0] ?? 0));
      const height = Math.abs(Number(bounds?.[3] ?? 0) - Number(bounds?.[1] ?? 0));
      const start = transformedPoint(pathMatrix, Number(bounds?.[0] ?? 0), Number(bounds?.[1] ?? 0));
      const end = transformedPoint(pathMatrix, Number(bounds?.[2] ?? 0), Number(bounds?.[3] ?? 0));
      const x = Math.min(start.x, end.x);
      const y = size.height - Math.max(start.y, end.y);
      const transformedWidth = Math.abs(end.x - start.x);
      const transformedHeight = Math.abs(end.y - start.y);
      const isStroke = fn === ops.stroke || fn === ops.closeStroke;
      const isFill = !isStroke;
      if (width <= 0.01 || height <= 0.01) {
        if (!isStroke) continue;
        const startX = start.x / POINTS_PER_INCH;
        const startY = (size.height - start.y) / POINTS_PER_INCH;
        const endX = end.x / POINTS_PER_INCH;
        const endY = (size.height - end.y) / POINTS_PER_INCH;
        slide.addShape("line", { x: Math.min(startX, endX), y: Math.min(startY, endY), w: Math.max(0.01, Math.abs(endX - startX)), h: Math.max(0.01, Math.abs(endY - startY)), line: { color: stroke, width: lineWidth }, objectName: "PDF vector line" });
        shapes += 1;
      } else {
        slide.addShape("rect", { x: x / POINTS_PER_INCH, y: y / POINTS_PER_INCH, w: transformedWidth / POINTS_PER_INCH, h: transformedHeight / POINTS_PER_INCH, fill: { color: fill, transparency: isFill ? 0 : 100 }, line: { color: stroke, width: lineWidth, transparency: isFill ? 100 : 0 }, objectName: "PDF vector rectangle" });
        shapes += 1;
      }
    } else if (fn === ops.paintImageXObject && page.objs && typeof args[0] === "string") {
      const image = await new Promise<PdfImage | null>((resolve) => page.objs?.get(args[0] as string, resolve));
      const data = image ? imageDataUrl(image) : null;
      if (data && image) {
        const box = transformedBox(matrix, 1, 1, size.height);
        slide.addImage({ data, x: box.x, y: box.y, w: box.w, h: box.h, rotate: box.rotate });
        images += 1;
      }
    }
  }
  return { shapes, images };
}

export function pdfToPptxOutputName(sourceName: string) {
  const base = sourceName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._ -]/g, "-").trim() || "document";
  return `${base}.pptx`;
}

export async function pdfToPptx(options: PdfToPptxOptions): Promise<PdfToPptxResult> {
  const report = (progress: PdfToPptxProgress) => options.onProgress?.(progress);
  let pdfDoc: { numPages: number; getPage: (pageNumber: number) => Promise<unknown>; cleanup?: () => void; destroy?: () => Promise<void> } | undefined;
  try {
    validatePdf(options.file);
    if (options.file.size > PDF_TO_PPTX_MAX_FILE_SIZE) {
      throw new FileTooLargeError(`PDF files larger than ${Math.round(PDF_TO_PPTX_MAX_FILE_SIZE / 1024 / 1024)} MB are not supported.`);
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    report({ status: "processing", phase: "loading", currentPage: 0, totalPages: 0, progress: 5, message: "Loading PDF..." });
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(options.file.buffer ?? []), useSystemFonts: true }).promise;
    pdfDoc = pdfDocument;
    if (pdfDocument.numPages < 1) throw new ValidationError("The PDF contains no pages.");

    const firstPage = await withTimeout(pdfDocument.getPage(1) as Promise<unknown>, PAGE_OPERATION_TIMEOUT_MS, "getPage(1)") as PdfPage;
    const firstSize = pageDimensions(firstPage);
    const slideWidth = firstSize.width / POINTS_PER_INCH;
    const slideHeight = firstSize.height / POINTS_PER_INCH;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "PDF_PAGE", width: slideWidth, height: slideHeight });
    pptx.layout = "PDF_PAGE";
    pptx.author = "DigiDesk PDF Tools";
    pptx.subject = "Editable PDF converted to PowerPoint";
    pptx.title = options.file.name;
    pptx.company = "DigiDesk";
    const substitutions = new Set<string>();
    let editableTextObjects = 0;
    let editableShapeObjects = 0;
    let nativeTableObjects = 0;
    let rasterFallbackPages = 0;
    report({ status: "processing", phase: "processing-pages", currentPage: 0, totalPages: pdfDocument.numPages, progress: 8, message: "Preparing page processing..." });

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const pageStartedAt = performance.now();
      const pageTimings: Record<string, number> = {};
      console.info("[PDF_TO_PPTX_PAGE_START]", { page: pageNumber, totalPages: pdfDocument.numPages, memory: process.memoryUsage() });
      let operationStartedAt = performance.now();
      const page = pageNumber === 1 ? firstPage : await withTimeout(pdfDocument.getPage(pageNumber) as Promise<unknown>, PAGE_OPERATION_TIMEOUT_MS, `getPage(${pageNumber})`) as PdfPage;
      pageTimings.getPage = Math.round(performance.now() - operationStartedAt);
      const size = pageDimensions(page);
      report({ status: "processing", phase: "extracting-text", currentPage: pageNumber, totalPages: pdfDocument.numPages, progress: Math.round(8 + ((pageNumber - 1) / pdfDocument.numPages) * 82), message: `Extracting text from page ${pageNumber} of ${pdfDocument.numPages}...` });
      operationStartedAt = performance.now();
      const textContent = await withTimeout(page.getTextContent(), PAGE_OPERATION_TIMEOUT_MS, `getTextContent(page ${pageNumber})`);
      pageTimings.getTextContent = Math.round(performance.now() - operationStartedAt);
      operationStartedAt = performance.now();
        const meaningfulText = textContent.items.filter((item): item is TextSpan => "str" in item && item.str.trim().length > 0).map((item) => item.str).join("").trim();
      pageTimings.textExtraction = Math.round(performance.now() - operationStartedAt);
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      if (meaningfulText.length < MIN_MEANINGFUL_TEXT) {
        operationStartedAt = performance.now();
        editableTextObjects += await withTimeout(addScannedPage(slide, page, size, slideWidth, slideHeight, (phase, message) => report({ status: "processing", phase, currentPage: pageNumber, totalPages: pdfDocument.numPages, progress: Math.round(8 + ((pageNumber - 1) / pdfDocument.numPages) * 82), message: `${message} Page ${pageNumber} of ${pdfDocument.numPages}.` })), PAGE_OPERATION_TIMEOUT_MS, `page ${pageNumber} OCR/raster processing`);
        pageTimings.ocrAndRaster = Math.round(performance.now() - operationStartedAt);
        rasterFallbackPages += 1;
      } else {
        operationStartedAt = performance.now();
        report({ status: "processing", phase: "extracting-images", currentPage: pageNumber, totalPages: pdfDocument.numPages, progress: Math.round(8 + ((pageNumber - 1) / pdfDocument.numPages) * 82 + 2), message: `Extracting images from page ${pageNumber} of ${pdfDocument.numPages}...` });
        const operatorList = await withTimeout(page.getOperatorList(), PAGE_OPERATION_TIMEOUT_MS, `getOperatorList(page ${pageNumber})`);
        pageTimings.imageAndVectorOperators = Math.round(performance.now() - operationStartedAt);
        operationStartedAt = performance.now();
        const ops = pdfjs.OPS as unknown as Record<string, number>;
        const hasEmbeddedImages = operatorList.fnArray.includes(ops.paintImageXObject) || operatorList.fnArray.includes(ops.paintJpegXObject);
        const hasVectorArtwork = operatorList.fnArray.includes(ops.constructPath);
        if (hasEmbeddedImages || hasVectorArtwork || operatorList.fnArray.length > MAX_EDITABLE_OPERATOR_COUNT) {
          operationStartedAt = performance.now();
          await withTimeout(addRasterPage(slide, page, size, slideWidth, slideHeight, textContent), PAGE_OPERATION_TIMEOUT_MS, `page ${pageNumber} raster fallback`);
          pageTimings.ocrAndRaster = Math.round(performance.now() - operationStartedAt);
          operationStartedAt = performance.now();
          editableTextObjects += addTextSpans(slide, textContent, size, substitutions, readTextColors(operatorList, ops));
          pageTimings.textReconstruction = Math.round(performance.now() - operationStartedAt);
          rasterFallbackPages += 1;
          logPageTiming(pageNumber, pdfDocument.numPages, pageStartedAt, pageTimings, { meaningfulText: meaningfulText.length, rasterFallback: true });
          console.warn("[PDF_TO_PPTX_RASTER_FALLBACK]", { page: pageNumber, operators: operatorList.fnArray.length, hasEmbeddedImages, limit: MAX_EDITABLE_OPERATOR_COUNT });
          if (pageNumber !== 1) page.cleanup();
          console.info("[PDF_TO_PPTX_PAGE_END]", { page: pageNumber, totalPages: pdfDocument.numPages });
          continue;
        }
        const table = detectNativeTable(textContent, size);
        pageTimings.tableDetection = Math.round(performance.now() - operationStartedAt);
        if (table) {
          report({ status: "processing", phase: "reconstructing-table", currentPage: pageNumber, totalPages: pdfDocument.numPages, progress: Math.round(8 + (pageNumber / pdfDocument.numPages) * 82), message: `Reconstructing table on page ${pageNumber} of ${pdfDocument.numPages}...` });
          console.info("[PDF_TO_PPTX_TABLE_START]", { page: pageNumber, rows: table.rows.length, columns: table.rows[0]?.length ?? 0, spans: table.spans.size, memory: process.memoryUsage() });
          operationStartedAt = performance.now();
          addNativeTable(slide, table);
          pageTimings.tableReconstruction = Math.round(performance.now() - operationStartedAt);
          console.info("[PDF_TO_PPTX_TABLE_END]", { page: pageNumber, elapsedMs: pageTimings.tableReconstruction, memory: process.memoryUsage() });
          nativeTableObjects += 1;
        }
        operationStartedAt = performance.now();
        const operatorObjects = await withTimeout(addOperatorObjects(slide, page, operatorList, ops, size), PAGE_OPERATION_TIMEOUT_MS, `page ${pageNumber} image/shape reconstruction`);
        pageTimings.imageExtractionAndShapeReconstruction = Math.round(performance.now() - operationStartedAt);
        report({ status: "processing", phase: "reconstructing-shapes", currentPage: pageNumber, totalPages: pdfDocument.numPages, progress: Math.round(8 + (pageNumber / pdfDocument.numPages) * 82), message: `Reconstructing editable objects on page ${pageNumber} of ${pdfDocument.numPages}...` });
        editableShapeObjects += operatorObjects.shapes;
        const annotations = await page.getAnnotations({ intent: "display" }) as unknown as PdfAnnotation[];
        editableShapeObjects += addSimpleAnnotations(slide, annotations, size.height);
        operationStartedAt = performance.now();
        editableTextObjects += addTextSpans(slide, textContent, size, substitutions, readTextColors(operatorList, ops), table?.spans);
        pageTimings.textReconstruction = Math.round(performance.now() - operationStartedAt);
      }
      if (pageNumber !== 1) page.cleanup();
      logPageTiming(pageNumber, pdfDocument.numPages, pageStartedAt, pageTimings, { meaningfulText: meaningfulText.length, rasterFallback: meaningfulText.length < MIN_MEANINGFUL_TEXT });
      console.info("[PDF_TO_PPTX_PAGE_END]", { page: pageNumber, totalPages: pdfDocument.numPages });
    }

    report({ status: "processing", phase: "generating-pptx", currentPage: pdfDocument.numPages, totalPages: pdfDocument.numPages, progress: 93, message: "Generating PowerPoint file..." });
    const output = await pptx.write({ outputType: "uint8array" }) as Uint8Array;
    if (!output.length) throw new Error("The PPTX conversion produced an empty file.");
    report({ status: "processing", phase: "validating", currentPage: pdfDocument.numPages, totalPages: pdfDocument.numPages, progress: 98, message: "Validating PowerPoint package..." });
    await validatePptxPackage(output, pdfDocument.numPages);
    report({ status: "completed", phase: "completed", currentPage: pdfDocument.numPages, totalPages: pdfDocument.numPages, progress: 100, message: "Conversion complete." });
    return {
      success: true,
      pptx: output,
      outputName: pdfToPptxOutputName(options.file.name),
      message: "Converted using editable PDF content reconstruction.",
      metadata: {
        pages: pdfDocument.numPages,
        editableTextObjects,
        editableShapeObjects,
        nativeTableObjects,
        rasterFallbackPages,
        fontSubstitutions: [...substitutions],
      },
    };
  } catch (error) {
    report({ status: "failed", phase: "failed", currentPage: 0, totalPages: 0, progress: 0, message: error instanceof Error ? error.message : "PDF to PowerPoint conversion failed." });
    return {
      success: false,
      message: error instanceof Error ? error.message : "PDF to PowerPoint conversion failed.",
    };
  } finally {
    try {
      pdfDoc?.cleanup?.();
      await pdfDoc?.destroy?.();
    } catch (cleanupError) {
      console.warn("[PDF_TO_PPTX_CLEANUP]", cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    }
  }
}

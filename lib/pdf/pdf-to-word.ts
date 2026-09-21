import JSZip from "jszip";
import { createCanvas } from "@napi-rs/canvas";

import type { PdfFile } from "./types";
import { ValidationError } from "./errors";
import { validatePdf } from "./validation";

export type PdfToWordMode = "digital" | "scanned" | "complex-form" | "standard" | "ocr";
export type OcrLanguage = "eng" | "hin" | "eng+hin";

export interface PdfToWordOptions {
  file: PdfFile;
  mode?: PdfToWordMode;
  language?: OcrLanguage;
  noPageBreaks?: boolean;
  addBorders?: boolean;
}

export interface PdfToWordResult {
  success: boolean;
  docx?: Uint8Array;
  outputName?: string;
  message: string;
  metadata?: {
    pages: number;
    mode: "digital" | "scanned" | "complex-form";
    language: OcrLanguage;
    paragraphs: number;
    scannedPages: number;
    digitalPages: number;
    complexFormPages: number;
    tables: number;
    images: number;
    words: number;
    warnings: string[];
    pageClassifications?: PageClassificationEntry[];
  };
}

export const PDF_TO_WORD_MODES = ["standard", "ocr", "digital", "scanned", "complex-form"] as const;
export const PDF_TO_WORD_LANGUAGES = ["eng", "hin", "eng+hin"] as const;

interface TextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
}

interface TextLine {
  text: string;
  y: number;
  x0: number;
  x1: number;
  size: number;
  runs: TextRun[];
}

interface ParagraphBlock {
  type: "paragraph" | "heading" | "list" | "caption" | "header" | "footer" | "page-number";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
}

interface TableModel {
  rows: string[][];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
  dataUrl?: string;
}

interface FormField {
  name: string;
  value: string;
  type: "text" | "checkbox" | "radio" | "date" | "choice" | "button" | "unknown";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageModel {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  mode: "digital" | "scanned" | "complex-form";
  textBlocks: ParagraphBlock[];
  tables: TableModel[];
  images: ImageRegion[];
  formFields?: FormField[];
  backgroundImageDataUrl?: string;
  ocrTextBoxes?: OcrTextBox[];
  header?: string;
  footer?: string;
  pageNumberText?: string;
  warnings: string[];
}

interface PageGeometry {
  width: number;
  height: number;
  rotation: number;
  viewportWidth: number;
  viewportHeight: number;
  view: number[];
}

type PageClassification = "digital" | "scanned" | "scanned-form" | "complex-form";

interface PageClassificationEntry {
  pageNumber: number;
  classification: PageClassification;
  nativeTextItems: number;
  nativeCharacters: number;
  nativeWords: number;
  nativeTextAreaRatio: number;
  imageCount: number;
  imageCoverageRatio: number;
  largestImageCoverageRatio: number;
  imageDimensions?: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  annotationCount: number;
  widgetCount: number;
  reason?: string[];
}

interface PdfPageLike {
  view?: number[];
  rotate?: number;
  getViewport?: (options: {
    scale?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
  }) => { width: number; height: number };
  getAnnotations?: () => Promise<Array<Record<string, unknown>>>;
  getTextContent?: () => Promise<{ items: Array<Record<string, unknown>> }>;
  getOperatorList?: () => Promise<{ fnArray?: number[] }>;
  render?: (options: {
    canvasContext: unknown;
    viewport: { width: number; height: number };
    canvas?: unknown;
    [key: string]: unknown;
  }) => { promise: Promise<void> };
}

interface OcrWord {
  text?: string;
  confidence?: number;
  bbox?: {
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
  };
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

interface OcrTextBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align: "left" | "center" | "right";
  confidence?: number;
}

function sanitizeText(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

function shouldShowOcrOverlay(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (normalized.length > 80) return false;
  if (/\b(?:certificate|examination|application|course|applicant|declaration|signature|contact|payment|address|qualification|father|mother|gender|category|office|form|online|technology|institute)\b/i.test(normalized)) {
    return false;
  }
  return /@|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}[-/][A-Za-z]{3,}[-/]\d{2,4}\b|\b[A-Z]{2,}\d{4,}\b|\b\d{7,}\b/i.test(normalized);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pointsToTwips(value: number): number {
  return Math.max(1, Math.round(value * 20));
}

function toPageGeometry(page: PdfPageLike): PageGeometry {
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

function normalizeMode(mode?: PdfToWordMode): "digital" | "scanned" | "complex-form" {
  switch (mode) {
    case "ocr":
      return "scanned";
    case "scanned":
      return "scanned";
    case "complex-form":
      return "complex-form";
    case "digital":
    case "standard":
    default:
      return "digital";
  }
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function inferAlignment(x: number, width: number, pageWidth: number): "left" | "center" | "right" {
  const center = x + width / 2;
  const ratio = center / (pageWidth || 1);
  if (ratio > 0.72) return "right";
  if (ratio < 0.28) return "left";
  return "center";
}

function toRuns(items: Array<Record<string, unknown>>, pageWidth: number): TextRun[] {
  const rows: TextRun[] = [];

  for (const item of items ?? []) {
    const text = sanitizeText(String(item.str ?? ""));
    if (!text) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [0, 0, 0, 0, 0, 0];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);
    const width = Number(item.width ?? 0);
    const height = Number(item.height ?? 0);
    const fontName = String(item.fontName ?? "");
    const size = Math.abs(Number(transform[3] ?? 0)) || 11;

    rows.push({
      text,
      x,
      y,
      width,
      height,
      font: fontName,
      size,
      bold: /bold|semibold|heavy|black/i.test(fontName),
      italic: /italic|oblique/i.test(fontName),
      underline: /underline/i.test(fontName),
      align: inferAlignment(x, width, pageWidth),
    });
  }

  return rows;
}

function collapseRunsToLines(runs: TextRun[]): TextLine[] {
  const groups: Array<{ y: number; runs: TextRun[] }> = [];

  for (const run of runs) {
    const match = groups.find((group) => Math.abs(group.y - run.y) <= 5);
    if (match) {
      match.runs.push(run);
    } else {
      groups.push({ y: run.y, runs: [run] });
    }
  }

  return groups
    .map((group) => {
      const ordered = [...group.runs].sort((a, b) => a.x - b.x);
      const text = ordered.map((run) => run.text).join(" ").replace(/\s+/g, " ").trim();
      if (!text) return null;

      const x0 = Math.min(...ordered.map((run) => run.x));
      const x1 = Math.max(...ordered.map((run) => run.x + run.width));
      return {
        text,
        y: group.y,
        x0,
        x1,
        size: Math.max(...ordered.map((run) => run.size), 11),
        runs: ordered,
      };
    })
    .filter((line): line is TextLine => Boolean(line));
}

function buildParagraphsFromLines(lines: TextLine[], pageWidth: number): ParagraphBlock[] {
  if (!lines.length) return [];

  const medianSize = median(lines.map((line) => line.size)) || 11;
  const paragraphs: ParagraphBlock[] = [];
  let current: TextLine[] = [];

  const flush = (): void => {
    if (!current.length) return;

    const text = current.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      current = [];
      return;
    }

    const size = Math.max(...current.map((line) => line.size));
    const bold = current.some((line) => line.runs.some((run) => run.bold));
    const italic = current.some((line) => line.runs.some((run) => run.italic));
    const underline = current.some((line) => line.runs.some((run) => run.underline));
    const align = current[0]?.runs[0]?.align ?? "left";
    const type: ParagraphBlock["type"] =
      size >= medianSize * 1.7 ? "heading" : /^\s*(?:[-*•]|\d+[.)])/.test(text) ? "list" : "paragraph";

    paragraphs.push({
      type,
      text,
      x: Math.min(...current.map((line) => line.x0)),
      y: Math.max(...current.map((line) => line.y)),
      width: Math.max(...current.map((line) => line.x1)) - Math.min(...current.map((line) => line.x0)),
      height: Math.max(...current.map((line) => line.size)),
      size,
      bold,
      italic,
      underline,
      align,
    });

    current = [];
  };

  const ordered = [...lines].sort((a, b) => b.y - a.y || a.x0 - b.x0);
  for (const line of ordered) {
    if (!current.length) {
      current.push(line);
      continue;
    }

    const previous = current[current.length - 1];
    const gap = previous.y - line.y;
    const threshold = Math.max(previous.size, line.size) * 1.6;
    const sameBlock = gap > 0 && gap <= threshold && line.x0 >= previous.x0 - 8 && line.x1 <= previous.x1 + pageWidth * 0.2;

    if (sameBlock) {
      current.push(line);
    } else {
      flush();
      current.push(line);
    }
  }

  flush();
  return paragraphs;
}

function detectPageMarginContent(lines: TextLine[], pageWidth: number, pageHeight: number): {
  header?: ParagraphBlock;
  footer?: ParagraphBlock;
  pageNumberText?: string;
} {
  if (!lines.length) return {};

  const topLines = lines.filter((line) => line.y > pageHeight * 0.82).sort((a, b) => b.y - a.y);
  const bottomLines = lines.filter((line) => line.y < pageHeight * 0.18).sort((a, b) => a.y - b.y);

  const summarizeLines = (candidateLines: TextLine[], type: ParagraphBlock["type"]) => {
    if (!candidateLines.length) return undefined;
    const ordered = [...candidateLines].sort((a, b) => a.x0 - b.x0);
    const text = ordered.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim();
    if (!text) return undefined;

    const size = Math.max(...ordered.map((line) => line.size));
    const x0 = Math.min(...ordered.map((line) => line.x0));
    const x1 = Math.max(...ordered.map((line) => line.x1));
    const y = type === "footer" ? Math.min(...ordered.map((line) => line.y)) : Math.max(...ordered.map((line) => line.y));

    return {
      type,
      text,
      x: x0,
      y,
      width: Math.max(0, x1 - x0),
      height: Math.max(10, size),
      size,
      bold: ordered.some((line) => line.runs.some((run) => run.bold)),
      italic: ordered.some((line) => line.runs.some((run) => run.italic)),
      underline: ordered.some((line) => line.runs.some((run) => run.underline)),
      align: x0 > pageWidth * 0.7 ? "right" : x0 < pageWidth * 0.3 ? "left" : "center",
    } as ParagraphBlock;
  };

  const header = summarizeLines(topLines.slice(0, 2), "header");
  const footer = summarizeLines(bottomLines.slice(0, 2), "footer");

  const pageNumberLine = [...lines]
    .filter((line) => /^(?:\d+|[ivxlcdm]+|page\s*\d+|\d+\s*of\s*\d+)$ /i.test(line.text.trim()))
    .sort((a, b) => Math.abs(a.y - pageHeight * 0.5) - Math.abs(b.y - pageHeight * 0.5))[0];

  const pageNumberText = pageNumberLine ? sanitizeText(pageNumberLine.text) : undefined;

  return { header, footer, pageNumberText };
}

function detectTablePattern(lines: TextLine[]): TableModel[] {
  if (lines.length < 2) return [];

  const xCenters = lines
    .flatMap((line) => line.runs)
    .map((run) => run.x + run.width / 2)
    .sort((a, b) => a - b);

  const clustered: number[] = [];
  for (const value of xCenters) {
    const last = clustered[clustered.length - 1];
    if (last === undefined || Math.abs(value - last) > 35) {
      clustered.push(value);
    }
  }

  if (clustered.length < 2) return [];

  const rowGroups: Array<{ y: number; lines: TextLine[] }> = [];
  for (const line of lines) {
    const match = rowGroups.find((group) => Math.abs(group.y - line.y) <= 8);
    if (match) {
      match.lines.push(line);
    } else {
      rowGroups.push({ y: line.y, lines: [line] });
    }
  }

  const rows: string[][] = [];
  for (const group of rowGroups) {
    const ordered = [...group.lines].sort((a, b) => a.x0 - b.x0);
    const cells: string[] = [];
    for (const center of clustered) {
      const match = ordered.find((line) => Math.abs(((line.x0 + line.x1) / 2) - center) <= 22);
      cells.push(match ? sanitizeText(match.text) : "");
    }
    if (cells.some((cell) => cell.trim())) {
      rows.push(cells);
    }
  }

  if (rows.length < 2) return [];

  return [{
    rows,
    x: Math.min(...lines.map((line) => line.x0)),
    y: Math.min(...lines.map((line) => line.y)),
    width: Math.max(...lines.map((line) => line.x1)) - Math.min(...lines.map((line) => line.x0)),
    height: Math.max(...lines.map((line) => line.y)) - Math.min(...lines.map((line) => line.y)),
  }];
}

async function extractFormFields(page: PdfPageLike): Promise<FormField[]> {
  if (typeof page.getAnnotations !== "function") return [];

  try {
    const annotations = (await page.getAnnotations()) ?? [];
    return annotations
      .map((annotation, index) => {
        const rect = Array.isArray(annotation.rect) ? annotation.rect : [0, 0, 0, 0];
        const x = Number(rect[0] ?? 0);
        const y = Number(rect[1] ?? 0);
        const width = Math.max(0, Number(rect[2] ?? 0) - x);
        const height = Math.max(0, Number(rect[3] ?? 0) - y);
        const name = String(annotation.fieldName ?? annotation.name ?? annotation.title ?? `Field ${index + 1}`);
        const rawValue = String(annotation.fieldValue ?? annotation.value ?? annotation.text ?? "");
        const type = String(annotation.fieldType ?? annotation.type ?? "").toLowerCase();

        if (!name || (!annotation.fieldName && !annotation.fieldType && !annotation.subtype && !rawValue && width <= 0 && height <= 0)) {
          return null;
        }

        const normalizedType: FormField["type"] =
          type.includes("checkbox") || type.includes("check") ? "checkbox" :
          type.includes("radio") ? "radio" :
          type.includes("date") ? "date" :
          type.includes("choice") || type.includes("select") ? "choice" :
          type.includes("button") ? "button" :
          type.includes("text") || type.includes("char") || type.includes("comb") ? "text" :
          "unknown";

        return {
          name: sanitizeText(name),
          value: sanitizeText(rawValue),
          type: normalizedType,
          x,
          y,
          width,
          height,
        } as FormField;
      })
      .filter((field): field is FormField => Boolean(field));
  } catch {
    return [];
  }
}

async function inspectPageFeatures(page: PdfPageLike): Promise<{
  textItems: number;
  visibleChars: number;
  nativeWords: number;
  nativeTextArea: number;
  imageCount: number;
  imageOpCount: number;
  annotationCount: number;
  widgetCount: number;
  pageWidth: number;
  pageHeight: number;
  pageArea: number;
  pageAspectRatio: number;
  fontCount: number;
  imageCoverageRatio: number;
  largestImageCoverageRatio: number;
  largestImageArea: number;
  largestImageWidth: number;
  largestImageHeight: number;
  largestImageAspectRatio: number;
  totalImageArea: number;
}> {
  let textItems = 0;
  let visibleChars = 0;
  let nativeWords = 0;
  let nativeTextArea = 0;
  let imageCount = 0;
  let imageOpCount = 0;
  let annotationCount = 0;
  let widgetCount = 0;
  let imageCoverageRatio = 0;
  let largestImageArea = 0;
  let totalImageArea = 0;
  let largestImageCoverageRatio = 0;
  let largestImageWidth = 0;
  let largestImageHeight = 0;
  let largestImageAspectRatio = 0;
  const fontSet = new Set<string>();

  try {
    const textContent = typeof page.getTextContent === "function" ? await page.getTextContent() : null;
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    textItems = items.length;

    for (const item of items) {
      const text = String((item as Record<string, unknown>).str ?? "").trim();
      if (!text) continue;
      visibleChars += text.length;
      nativeWords += text.split(/\s+/).filter(Boolean).length;

      const width = Number((item as Record<string, unknown>).width ?? 0);
      const height = Number((item as Record<string, unknown>).height ?? 0);
      const transform = Array.isArray((item as Record<string, unknown>).transform) ? (item as Record<string, unknown>).transform as number[] : [0, 0, 0, 0, 0, 0];
      const itemWidth = Number(width || (transform[2] ?? 0) || 0);
      const itemHeight = Number(height || (transform[3] ?? 0) || 0);
      nativeTextArea += Math.max(0, itemWidth * itemHeight);

      const fontName = String((item as Record<string, unknown>).fontName ?? "").trim();
      if (fontName) fontSet.add(fontName);
    }
  } catch {
    // ignore text extraction issues; fallback to OCR classification
  }

  try {
    if (typeof page.getAnnotations === "function") {
      const annotations = await page.getAnnotations();
      annotationCount = Array.isArray(annotations) ? annotations.length : 0;
      widgetCount = Array.isArray(annotations)
        ? annotations.filter((annotation) => String(annotation.subtype ?? "") === "Widget" || String(annotation.fieldType ?? "").length > 0).length
        : 0;
    }
  } catch {
    // ignore annotations issues during classification
  }

  try {
    const opList = typeof page.getOperatorList === "function" ? await page.getOperatorList() : null;
    const fnArray = Array.isArray(opList?.fnArray) ? opList.fnArray : [];
    imageOpCount = fnArray.filter((op) => op === 85 || op === 86 || op === 88 || op === 90).length;
    imageCount = imageOpCount;
  } catch {
    // ignore operator list issues during classification
  }

  const geometry = toPageGeometry(page);
  const pageWidth = geometry.width || 595;
  const pageHeight = geometry.height || 842;

  try {
    if (typeof page.getViewport === "function" && typeof page.render === "function") {
      const viewport = page.getViewport({ scale: 0.6, rotation: geometry.rotation });
      const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let nonWhitePixels = 0;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const offset = (y * canvas.width + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const brightness = (r + g + b) / 3;
          if (brightness >= 245) continue;

          nonWhitePixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      const totalPixels = canvas.width * canvas.height;
      const width = Math.max(0, maxX - minX + 1);
      const height = Math.max(0, maxY - minY + 1);
      const area = width * height;
      imageCoverageRatio = totalPixels > 0 ? nonWhitePixels / totalPixels : 0;
      largestImageArea = area;
      totalImageArea = nonWhitePixels;
      largestImageCoverageRatio = pageWidth > 0 && pageHeight > 0 ? (area / (pageWidth * pageHeight)) : 0;
      largestImageWidth = width;
      largestImageHeight = height;
      largestImageAspectRatio = width > 0 && height > 0 ? width / height : 0;
    }
  } catch {
    // best effort only; do not break classification
  }

  const pageArea = pageWidth * pageHeight;
  const pageAspectRatio = pageWidth > 0 && pageHeight > 0 ? pageWidth / pageHeight : 1;

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
    pageAspectRatio,
    fontCount: fontSet.size,
    imageCoverageRatio,
    largestImageCoverageRatio,
    largestImageArea,
    largestImageWidth,
    largestImageHeight,
    largestImageAspectRatio,
    totalImageArea,
  };
}

function isReliableNativeTextPage(features: {
  visibleChars: number;
  nativeWords: number;
  nativeTextArea: number;
  pageArea: number;
  textItems: number;
  fontCount: number;
}): boolean {
  const coverage = features.pageArea > 0 ? features.nativeTextArea / features.pageArea : 0;
  const hasMeaningfulText = features.textItems >= 3 && features.nativeWords >= 4 && features.visibleChars >= 24;
  const hasCoherentText = features.nativeWords >= 8 && features.visibleChars >= 40 && coverage >= 0.005;
  const hasDenseText = features.visibleChars >= 60 && coverage >= 0.01;
  const hasFontEvidence = features.fontCount > 0 && features.textItems >= 2 && features.visibleChars >= 12;

  if (!hasMeaningfulText) return false;
  if (hasCoherentText || hasDenseText || hasFontEvidence) return true;
  return false;
}

function isNativeTextReliable(features: {
  visibleChars: number;
  nativeWords: number;
  nativeTextArea: number;
  pageArea: number;
  textItems: number;
  fontCount: number;
}): boolean {
  return isReliableNativeTextPage(features);
}

async function classifyPage(page: PdfPageLike): Promise<{
  classification: PageClassification;
  reason: string[];
  features: Awaited<ReturnType<typeof inspectPageFeatures>>;
}> {
  const features = await inspectPageFeatures(page);
  const hasReliableNativeText = isNativeTextReliable(features);
  const hasUsableWidgets = features.widgetCount > 0;
  const textMinimal = features.visibleChars < 24 || features.nativeWords < 4;
  const zeroNativeText = features.visibleChars === 0 && features.nativeWords === 0 && features.textItems === 0;
  const pageTextCoverage = features.pageArea > 0 ? features.nativeTextArea / features.pageArea : 0;
  const imageCoverageRatio = features.imageCoverageRatio ?? 0;
  const largestImageCoverageRatio = features.largestImageCoverageRatio ?? 0;
  const dominantImageCoverage = largestImageCoverageRatio >= 0.28;
  const overallRasterCoverage = imageCoverageRatio >= 0.05;
  const pageSizedRaster =
    features.largestImageWidth > 0 &&
    features.largestImageHeight > 0 &&
    (
      (features.largestImageWidth / Math.max(1, features.pageWidth) >= 0.7 && features.largestImageHeight / Math.max(1, features.pageHeight) >= 0.6) ||
      (features.largestImageAspectRatio > 0 && Math.abs(features.largestImageAspectRatio - features.pageAspectRatio) <= 0.85)
    );
  const strongScannedSignal =
    zeroNativeText &&
    !hasUsableWidgets &&
    features.annotationCount <= 2 &&
    dominantImageCoverage &&
    overallRasterCoverage &&
    pageSizedRaster &&
    pageTextCoverage < 0.015;
  const smallRaster = imageCoverageRatio > 0 && imageCoverageRatio < 0.35;
  const partialRaster = imageCoverageRatio >= 0.35 && imageCoverageRatio < 0.6;
  const largeRaster = imageCoverageRatio >= 0.6 || largestImageCoverageRatio >= 0.7;
  const imageDominant = imageCoverageRatio >= 0.6 && pageTextCoverage < 0.02;
  const reason: string[] = [];

  if (hasReliableNativeText) reason.push("reliable native text");
  if (features.fontCount > 0) reason.push("font metadata present");
  if (features.textItems > 0) reason.push("coherent text evidence");
  if (textMinimal) reason.push("text minimal");
  if (zeroNativeText) reason.push("native text absent");
  if (features.imageOpCount > 0) reason.push("image present");
  if (imageCoverageRatio > 0) reason.push(`image coverage ${imageCoverageRatio.toFixed(3)}`);
  if (largestImageCoverageRatio > 0) reason.push(`largest image ${largestImageCoverageRatio.toFixed(3)}`);

  if (hasReliableNativeText) return { classification: "digital", reason, features };
  if (hasUsableWidgets) return { classification: "complex-form", reason: ["widgets present", ...reason], features };

  if (strongScannedSignal) {
    return {
      classification: "scanned",
      reason: ["no native text + dominant page-sized raster + no widgets + OCR appropriate", ...reason],
      features,
    };
  }

  if (zeroNativeText && smallRaster && !hasUsableWidgets && features.annotationCount <= 2) {
    return { classification: "digital", reason: ["no native text + low image coverage + decorative/local image", ...reason], features };
  }

  if (zeroNativeText && partialRaster && !hasUsableWidgets && features.annotationCount <= 2) {
    return { classification: "digital", reason: ["no native text + partial-page image + not full-page raster", ...reason], features };
  }

  if (zeroNativeText && largeRaster && !hasUsableWidgets && features.annotationCount <= 2) {
    return { classification: "scanned", reason: ["no native text + near-full-page raster + no widgets", ...reason], features };
  }

  if (!hasReliableNativeText && !hasUsableWidgets && imageDominant && features.annotationCount <= 2) {
    return { classification: "scanned", reason: ["no native text + dominant image coverage + OCR appropriate", ...reason], features };
  }

  return { classification: "digital", reason: ["no strong scanned evidence + local or decorative image content", ...reason], features };
}

async function detectComplexForm(page: PdfPageLike): Promise<boolean> {
  const evidence: number[] = [];

  try {
    if (typeof page.getAnnotations === "function") {
      const annotations = await page.getAnnotations();
      const widgetCount = Array.isArray(annotations)
        ? annotations.filter((annotation) => String(annotation.subtype ?? "") === "Widget" || String(annotation.fieldType ?? "").length > 0).length
        : 0;
      if (widgetCount > 0) evidence.push(60 + widgetCount * 10);
      if (Array.isArray(annotations) && annotations.length > 8) evidence.push(20);
    }
  } catch {
    // ignore annotation errors; continue with text- and structure-based detection
  }

  try {
    const textContent = typeof page.getTextContent === "function" ? await page.getTextContent() : null;
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    const visibleChars = items.filter((item) => String((item as Record<string, unknown>).str ?? "").trim().length > 0).length;
    const density = visibleChars > 0 ? Math.min(visibleChars / 120, 1) : 0;
    evidence.push(density * 30);
    if (visibleChars <= 8) evidence.push(25);
  } catch {
    // ignore text-content errors
  }

  try {
    const opList = typeof page.getOperatorList === "function" ? await page.getOperatorList() : null;
    const fnArray = Array.isArray(opList?.fnArray) ? opList.fnArray : [];
    const imageOps = fnArray.filter((op) => op === 85 || op === 86 || op === 88 || op === 90).length;
    const vectorOps = fnArray.filter((op) => op === 19 || op === 20 || op === 21 || op === 22 || op === 23 || op === 24).length;
    if (imageOps > 0) evidence.push(10 + Math.min(imageOps, 6) * 8);
    if (vectorOps > 30) evidence.push(15);
    if (imageOps > 0 && !fnArray.some((op) => op === 11)) evidence.push(20);
  } catch {
    // ignore operator-list errors
  }

  const geometry = toPageGeometry(page);
  const area = geometry.width * geometry.height;
  const ratio = area > 0 ? (geometry.width / geometry.height) : 1;
  if (ratio > 2 || ratio < 0.4) evidence.push(12);

  const totalEvidence = evidence.reduce((sum, current) => sum + current, 0);
  return totalEvidence >= 70;
}

async function extractImageRegions(page: PdfPageLike, pageNumber: number): Promise<ImageRegion[]> {
  const geometry = toPageGeometry(page);
  const pageWidth = geometry.width || 595;
  const pageHeight = geometry.height || 842;
  const regions: ImageRegion[] = [];

  try {
    const opList = typeof page.getOperatorList === "function" ? await page.getOperatorList() : null;
    const fnArray = Array.isArray(opList?.fnArray) ? opList.fnArray : [];
    const imageOpCount = fnArray.filter((op) => op === 85 || op === 86 || op === 88 || op === 90).length;
    if (imageOpCount <= 0) return regions;

    const renderWidth = Math.min(Math.max(pageWidth * 0.65, 180), pageWidth);
    const renderHeight = Math.min(Math.max(pageHeight * 0.45, 120), pageHeight);
    const canvas = createCanvas(Math.max(1, Math.round(renderWidth)), Math.max(1, Math.round(renderHeight)));
    const _context = canvas.getContext("2d");
    if (typeof page.getViewport !== "function" || typeof page.render !== "function") {
      return regions;
    }

    const cropViewport = page.getViewport({
      scale: 1,
      rotation: geometry.rotation,
      offsetX: 0,
      offsetY: 0,
    });
    const clip = {
      x: Math.max(0, cropViewport.width * 0.15),
      y: Math.max(0, cropViewport.height * 0.2),
      width: Math.max(60, cropViewport.width * 0.65),
      height: Math.max(60, cropViewport.height * 0.45),
    };

    const cropCanvas = createCanvas(Math.max(1, Math.round(clip.width)), Math.max(1, Math.round(clip.height)));
    const cropContext = cropCanvas.getContext("2d");
    const cropViewport2 = page.getViewport({
      scale: 1,
      rotation: geometry.rotation,
      offsetX: clip.x,
      offsetY: clip.y,
    });

    await page.render({ canvasContext: cropContext, viewport: cropViewport2 }).promise;
    regions.push({
      x: clip.x,
      y: clip.y,
      width: Math.max(60, clip.width),
      height: Math.max(60, clip.height),
      caption: `Figure ${pageNumber}`,
      dataUrl: cropCanvas.toDataURL("image/png"),
    });
  } catch {
    // image extraction is best-effort and must not break page conversion
  }

  return regions;
}

async function parseDigitalPage(
  page: PdfPageLike,
  pageNumber: number,
): Promise<PageModel> {
  const geometry = toPageGeometry(page);
  const pageWidth = geometry.width || 595;
  const pageHeight = geometry.height || 842;
  
  if (typeof page.getTextContent !== "function") {
    return {
      pageNumber,
      width: pageWidth,
      height: pageHeight,
      rotation: geometry.rotation,
      mode: "digital",
      textBlocks: [],
      tables: [],
      images: [],
      warnings: ["Page has no extractable text content."],
    };
  }

  const { items } = await page.getTextContent();
  const images = await extractImageRegions(page, pageNumber);
  
  // If no native text, preserve content as object-level images unless the page is
  // genuinely a page-sized raster. The unconditional whole-page raster fallback is
  // not valid for local figures, vector artwork, or incidental image content.
  if (!items || items.length === 0) {
    const features = await inspectPageFeatures(page);
    const hasLargeRasterCoverage =
      (features.imageCoverageRatio ?? 0) >= 0.6 ||
      (features.largestImageCoverageRatio ?? 0) >= 0.7 ||
      (
        features.largestImageWidth > 0 &&
        features.largestImageHeight > 0 &&
        features.largestImageWidth / Math.max(1, pageWidth) >= 0.7 &&
        features.largestImageHeight / Math.max(1, pageHeight) >= 0.6
      );

    if (images.length > 0 && hasLargeRasterCoverage) {
      const backgroundImage = await renderPageToPng(page, 1.5);
      return {
        pageNumber,
        width: pageWidth,
        height: pageHeight,
        rotation: geometry.rotation,
        mode: "digital",
        textBlocks: [],
        tables: [],
        images,
        backgroundImageDataUrl: `data:image/png;base64,${Buffer.from(backgroundImage).toString("base64")}`,
        warnings: ["Page has no native text and is a true page-sized raster; retained as a full-page background fallback."],
      };
    }

    if (images.length > 0) {
      return {
        pageNumber,
        width: pageWidth,
        height: pageHeight,
        rotation: geometry.rotation,
        mode: "digital",
        textBlocks: [],
        tables: [],
        images,
        warnings: ["Page has no native text; preserved as object-level image content instead of a full-page background raster."],
      };
    }

    return {
      pageNumber,
      width: pageWidth,
      height: pageHeight,
      rotation: geometry.rotation,
      mode: "digital",
      textBlocks: [],
      tables: [],
      images: [],
      warnings: ["Page has no extractable text or images."],
    };
  }

  // Preserve coordinates: convert items directly to positioned blocks
  const positionedBlocks: ParagraphBlock[] = [];
  const processedTexts = new Set<string>();
  
  for (const item of items) {
    const text = sanitizeText(String(item.str ?? ""));
    if (!text) continue;
    
    const transform = Array.isArray(item.transform) ? (item.transform as number[]) : [0, 0, 0, 0, 0, 0];
    const key = `${text}|${Math.round(Number(transform[4] ?? 0))}|${Math.round(Number(transform[5] ?? 0))}`;
    if (processedTexts.has(key)) continue;
    processedTexts.add(key);
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);
    const width = Math.max(10, Number(item.width ?? 0));
    const height = Math.max(6, Math.abs(Number(transform[3] ?? 0)));
    const fontName = String(item.fontName ?? "");
    const size = Math.max(6, Math.abs(Number(transform[3] ?? 0)));
    
    positionedBlocks.push({
      type: "paragraph",
      text,
      x,
      y,
      width,
      height,
      size,
      bold: /bold|semibold|heavy|black/i.test(fontName),
      italic: /italic|oblique/i.test(fontName),
      underline: /underline/i.test(fontName),
      align: x + width / 2 > pageWidth * 0.72 ? "right" : x + width / 2 < pageWidth * 0.28 ? "left" : "center",
    });
  }

  // Detect page structure
  const runs = toRuns(items ?? [], pageWidth);
  const lines = collapseRunsToLines(runs);
  const tables = detectTablePattern(lines);

  return {
    pageNumber,
    width: pageWidth,
    height: pageHeight,
    rotation: geometry.rotation,
    mode: "digital",
    textBlocks: positionedBlocks,
    tables,
    images,
    warnings: [],
  };
}

async function renderPageToPng(page: PdfPageLike, scale = 1.8): Promise<Uint8Array> {
  const geometry = toPageGeometry(page);
  if (typeof page.getViewport !== "function" || typeof page.render !== "function") {
    const fallback = createCanvas(595, 842);
    return new Uint8Array(fallback.toBuffer("image/png"));
  }

  const viewport = page.getViewport({ scale, rotation: geometry.rotation });
  const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  return new Uint8Array(canvas.toBuffer("image/png"));
}

async function recognizeScannedPage(page: PdfPageLike, language: OcrLanguage): Promise<{ textBlocks: ParagraphBlock[]; ocrTextBoxes: OcrTextBox[]; warnings: string[]; width: number; height: number }> {
  const ocrScale = 1.8;
  const png = await renderPageToPng(page, ocrScale);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(language, 1, {
    langPath: "storage/tessdata",
    cachePath: "storage/.ocr-cache",
  });

  try {
    const result = await (worker as unknown as { recognize: (image: Uint8Array, options: object, output: object) => Promise<{ data: unknown }> })
      .recognize(png, {}, { blocks: true });
    const geometry = toPageGeometry(page);
    const pageWidth = geometry.width || 595;
    const pageHeight = geometry.height || 842;
    const data = result.data as {
      words?: OcrWord[];
      lines?: Array<{ words?: OcrWord[] }>;
      blocks?: Array<{
        paragraphs?: Array<{
          lines?: Array<{ words?: OcrWord[] }>;
        }>;
      }>;
      text?: string;
      confidence?: number;
    };

    const words = Array.isArray(data.words)
      ? data.words
      : Array.isArray(data.lines)
        ? data.lines.flatMap((line) => Array.isArray(line.words) ? line.words : [])
        : Array.isArray(data.blocks)
          ? data.blocks.flatMap((block) => (block.paragraphs ?? []).flatMap((paragraph) =>
            (paragraph.lines ?? []).flatMap((line) => Array.isArray(line.words) ? line.words : [])))
          : [];
    const groups: Array<{ y: number; words: Array<{ text: string; x0: number; y0: number; x1: number; y1: number; confidence: number }> }> = [];

    for (const word of words) {
      const text = sanitizeText(String(word.text ?? ""));
      if (!text) continue;
      const y = Number(word.bbox?.y0 ?? word.y0 ?? 0) / ocrScale;
      const match = groups.find((group) => Math.abs(group.y - y) <= 6);
      if (match) {
        match.words.push({
          text,
          x0: Number(word.bbox?.x0 ?? 0) / ocrScale,
          y0: y,
          x1: Number(word.bbox?.x1 ?? 0) / ocrScale,
          y1: Number(word.bbox?.y1 ?? 0) / ocrScale,
          confidence: Number(word.confidence ?? 0),
        });
      } else {
        groups.push({
          y,
          words: [{
            text,
            x0: Number(word.bbox?.x0 ?? 0) / ocrScale,
            y0: y,
            x1: Number(word.bbox?.x1 ?? 0) / ocrScale,
            y1: Number(word.bbox?.y1 ?? 0) / ocrScale,
            confidence: Number(word.confidence ?? 0),
          }],
        });
      }
    }

    const ocrTextBoxes: OcrTextBox[] = [];
    for (const group of groups) {
      const ordered = [...group.words].sort((a, b) => a.x0 - b.x0);
      const text = ordered.map((word) => word.text).join(" ").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const x0 = Math.min(...ordered.map((word) => word.x0));
      const x1 = Math.max(...ordered.map((word) => word.x1));
      const y0 = Math.min(...ordered.map((word) => word.y0));
      const y1 = Math.max(...ordered.map((word) => word.y1));
      const width = Math.max(18, x1 - x0);
      const height = Math.max(14, y1 - y0);
      const fontSize = clamp(Math.round(height * 0.7), 8, 28);
      ocrTextBoxes.push({
        text,
        x: x0,
        y: y0,
        width,
        height,
        fontSize,
        align: x0 > pageWidth * 0.7 ? "right" : "left",
        confidence: ordered.reduce((sum, word) => sum + word.confidence, 0) / ordered.length,
      });
    }

    const dedupedBoxes: OcrTextBox[] = [];
    for (const box of ocrTextBoxes) {
      const overlapping = dedupedBoxes.find((existing) => {
        const overlapX = Math.min(existing.x + existing.width, box.x + box.width) - Math.max(existing.x, box.x);
        const overlapY = Math.min(existing.y + existing.height, box.y + box.height) - Math.max(existing.y, box.y);
        const sameText = existing.text.toLowerCase() === box.text.toLowerCase();
        return (sameText || (overlapX > 0 && overlapY > 0)) && Math.abs(existing.y - box.y) <= 8;
      });
      if (overlapping) continue;
      dedupedBoxes.push(box);
    }
    let textBlocks: ParagraphBlock[] = dedupedBoxes.map((box) => ({
      type: "paragraph",
      text: box.text,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      size: box.fontSize,
      bold: false,
      italic: false,
      underline: false,
      align: box.align,
    }));

    if (!textBlocks.length) {
      const rawText = sanitizeText(String(data.text ?? ""));
      const rawLines = rawText
        .split(/\r?\n/)
        .map((line) => sanitizeText(line))
        .filter((line) => line.length > 1 && !/^[-_=]+$/.test(line));

      if (rawLines.length > 0) {
        const confidence = Number(data.confidence ?? 0);
        textBlocks = rawLines
          .map((line, index) => {
            const wordsInLine = line.split(/\s+/).filter(Boolean).length;
            if (wordsInLine === 0) return null;
            const lineWidth = clamp((line.length / Math.max(pageWidth / 8, 1)) * 14, 40, pageWidth - 20);
            const x = index % 2 === 0 ? 20 : Math.max(60, pageWidth * 0.45);
            const y = Math.max(20, pageHeight - (index + 1) * 28);
            const blockText = line.replace(/\s+/g, " ").trim();
            const size = confidence >= 60 ? 12 : confidence >= 35 ? 11 : 10;
            return {
              type: /\b(?:form|details|application|course|certificate|exam|candidate|date|time|number|name)\b/i.test(blockText) ? "heading" : "paragraph",
              text: blockText,
              x,
              y,
              width: lineWidth,
              height: Math.max(16, size + 4),
              size,
              bold: /\b(?:application|certificate|exam|form|course|candidate|details)\b/i.test(blockText),
              italic: false,
              underline: false,
              align: x > pageWidth * 0.6 ? "right" : "left",
            } as ParagraphBlock;
          })
          .filter((block): block is ParagraphBlock => block !== null);
      }
    }

    return {
      textBlocks,
      ocrTextBoxes: dedupedBoxes,
      warnings: textBlocks.length ? [] : ["OCR did not return usable text for this scanned page."],
      width: pageWidth,
      height: pageHeight,
    };
  } finally {
    await worker.terminate();
  }
}

async function parseScannedPage(
  page: PdfPageLike,
  pageNumber: number,
  language: OcrLanguage,
): Promise<PageModel> {
  const geometry = toPageGeometry(page);
  const result = await recognizeScannedPage(page, language);
  const pageWidth = result.width || geometry.width || 595;
  const pageHeight = result.height || geometry.height || 842;
  const marginContent = detectPageMarginContent(
    result.textBlocks.map((block: ParagraphBlock) => ({
      text: block.text,
      y: block.y,
      x0: block.x,
      x1: block.x + block.width,
      size: block.size,
      runs: [],
    } as TextLine)),
    pageWidth,
    pageHeight,
  );

  return {
    pageNumber,
    width: pageWidth,
    height: pageHeight,
    rotation: geometry.rotation,
    mode: "scanned",
    textBlocks: result.textBlocks,
    tables: [],
    images: await extractImageRegions(page, pageNumber),
    backgroundImageDataUrl: await renderPageToDataUrl(page, 1.0),
    ocrTextBoxes: result.ocrTextBoxes,
    header: marginContent.header?.text,
    footer: marginContent.footer?.text,
    pageNumberText: marginContent.pageNumberText,
    warnings: result.warnings,
  };
}

async function parseComplexFormPage(
  page: PdfPageLike,
  pageNumber: number,
): Promise<PageModel> {
  const geometry = toPageGeometry(page);
  const pageWidth = geometry.width || 595;
  const pageHeight = geometry.height || 842;
  const formFields = await extractFormFields(page);

  if (typeof page.getTextContent !== "function") {
    const fallbackTextBlocks = formFields.length
      ? formFields.map((field) => ({
          type: "paragraph" as const,
          text: `${field.name}${field.value ? `: ${field.value}` : ""}`,
          x: field.x,
          y: field.y,
          width: Math.max(100, field.width),
          height: Math.max(12, field.height),
          size: 11,
          bold: false,
          italic: false,
          underline: false,
          align: "left" as const,
        }))
      : [];

    return {
      pageNumber,
      width: pageWidth,
      height: pageHeight,
      rotation: geometry.rotation,
      mode: "complex-form",
      textBlocks: fallbackTextBlocks,
      tables: [],
      images: await extractImageRegions(page, pageNumber),
      formFields,
      warnings: ["Complex form mode preserved form field labels and values where the PDF exposed field metadata."],
    };
  }

  const { items } = await page.getTextContent();
  const runs = toRuns(items ?? [], pageWidth);
  const lines = collapseRunsToLines(runs);
  const textBlocks = buildParagraphsFromLines(lines, pageWidth);
  const marginContent = detectPageMarginContent(lines, pageWidth, pageHeight);

  const fieldTextBlocks = formFields.length
    ? formFields.map((field) => ({
        type: "paragraph" as const,
        text: `${field.name}${field.value ? `: ${field.value}` : ""}`,
        x: field.x,
        y: field.y,
        width: Math.max(100, field.width),
        height: Math.max(12, field.height),
        size: 10,
        bold: field.type === "checkbox" || field.type === "radio",
        italic: field.type === "date",
        underline: false,
        align: "left" as const,
      } as ParagraphBlock))
    : [];

  const fallbackOcrText = textBlocks.length === 0 && fieldTextBlocks.length === 0
    ? await recognizeScannedPage(page, "eng").then((result) => result.textBlocks)
    : [];

  const combinedText = textBlocks.length > 0 ? [...textBlocks, ...fieldTextBlocks] : fieldTextBlocks.length > 0 ? fieldTextBlocks : fallbackOcrText;

  return {
    pageNumber,
    width: pageWidth,
    height: pageHeight,
    rotation: geometry.rotation,
    mode: "complex-form",
    textBlocks: combinedText,
    tables: [],
    images: await extractImageRegions(page, pageNumber),
    formFields,
    header: marginContent.header?.text,
    footer: marginContent.footer?.text,
    pageNumberText: marginContent.pageNumberText,
    warnings: formFields.length ? ["Complex form mode preserved form field labels and values where the PDF exposed field metadata."] : ["Complex form mode preserves form-like layout and keeps content editable."],
  };
}

function imageXml(image: ImageRegion, imageIndex: number): string {
  if (!image.dataUrl) {
    return `<w:p><w:r><w:t>${xmlEscape(image.caption ?? "Figure")}</w:t></w:r></w:p>`;
  }

  const cx = Math.max(1, Math.round(image.width * 12700));
  const cy = Math.max(1, Math.round(image.height * 12700));
  return `
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:docPr id="${imageIndex + 10}" name="Figure ${imageIndex + 1}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${imageIndex + 1}" name="Figure ${imageIndex + 1}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rId${imageIndex + 1}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

function paragraphXml(block: ParagraphBlock): string {
  const styleValue = block.type === "heading" ? "Heading1" : block.type === "list" ? "ListParagraph" : "Normal";
  const align = block.align === "center" ? "center" : block.align === "right" ? "right" : "left";
  const spacing = block.type === "heading"
    ? '<w:spacing w:before="160" w:after="80"/>'
    : '<w:spacing w:before="0" w:after="0"/>';
  const formatting: string[] = [];
  if (block.bold) formatting.push("<w:b/><w:bCs/>");
  if (block.italic) formatting.push("<w:i/><w:iCs/>");
  if (block.underline) formatting.push("<w:u w:val=\"single\"/>");
  if (block.size) {
    const value = clamp(Math.round(block.size * 2), 8, 96);
    formatting.push(`<w:sz w:val="${value}"/><w:szCs w:val="${value}"/>`);
  }

  return `
    <w:p>
      <w:pPr><w:pStyle w:val="${styleValue}"/><w:jc w:val="${align}"/>${spacing}</w:pPr>
      <w:r>
        <w:rPr>${formatting.join("")}</w:rPr>
        <w:t xml:space="preserve">${xmlEscape(block.text)}</w:t>
      </w:r>
    </w:p>
  `;
}

function tableXml(table: TableModel): string {
  const borderXml = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tblBorders>`;

  const rowsXml = table.rows
    .map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const cellsXml = row
        .map((cell) => {
          const width = Math.max(120, Math.round((table.width / Math.max(row.length, 1)) * 20));
          const shadingXml = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' : "";
          const boldXml = isHeader ? "<w:b/><w:bCs/>" : "";
          return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shadingXml}</w:tcPr><w:p><w:r><w:rPr>${boldXml}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(cell)}</w:t></w:r></w:p></w:tc>`;
        })
        .join("");
      const trPrXml = isHeader ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
      return `<w:tr>${trPrXml}${cellsXml}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round(table.width * 20)}" w:type="dxa"/><w:tblLayout w:type="autofit"/>${borderXml}</w:tblPr>${rowsXml}</w:tbl>`;
}

function pointsToEmu(value: number): number {
  return Math.max(1, Math.round(value * 12700));
}

function renderPageToDataUrl(page: PdfPageLike, scale = 1.0): Promise<string> {
  const geometry = toPageGeometry(page);
  if (typeof page.getViewport !== "function" || typeof page.render !== "function") {
    const fallback = createCanvas(Math.max(1, Math.round((geometry.width || 595))), Math.max(1, Math.round((geometry.height || 842))));
    return Promise.resolve(fallback.toDataURL("image/png"));
  }

  const viewport = page.getViewport({ scale, rotation: geometry.rotation });
  const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
  const context = canvas.getContext("2d");
  return page.render({ canvasContext: context, viewport }).promise.then(() => canvas.toDataURL("image/png"));
}

function backgroundImageXml(dataUrl: string, pageWidth: number, pageHeight: number, imageIndex: number): string {
  const dataUrlMatch = dataUrl.match(/^data:image\/png;base64,(.*)$/i);
  if (!dataUrlMatch?.[1]) return "";

  const fileName = `scan-bg-${imageIndex}.png`;
  const cx = pointsToEmu(pageWidth);
  const cy = pointsToEmu(pageHeight);
  return `
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" simplePos="0" relativeHeight="0" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" distT="0" distB="0" distL="0" distR="0">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>
            <wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:wrapNone/>
            <wp:docPr id="${imageIndex + 100}" name="Page Background ${imageIndex}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${imageIndex + 1}" name="Page Background ${imageIndex}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rId${imageIndex + 1000}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

function ocrTextBoxXml(box: OcrTextBox, index: number, pageWidth: number, pageHeight: number): string {
  const x = Math.max(0, box.x / Math.max(1, pageWidth) * pageWidth);
  const y = Math.max(0, box.y / Math.max(1, pageHeight) * pageHeight);
  const cx = pointsToEmu(Math.max(24, box.width));
  const cy = pointsToEmu(Math.max(18, box.height));
  const xOffset = pointsToEmu(x);
  const yOffset = pointsToEmu(y);
  const fontSize = clamp(Math.round(box.fontSize), 10, 72);
  const text = xmlEscape(box.text);
  const showOverlay = shouldShowOcrOverlay(box.text);

  return `
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" simplePos="0" relativeHeight="0" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" distT="0" distB="0" distL="0" distR="0">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="page"><wp:posOffset>${xOffset}</wp:posOffset></wp:positionH>
            <wp:positionV relativeFrom="page"><wp:posOffset>${yOffset}</wp:posOffset></wp:positionV>
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:wrapNone/>
            <wp:docPr id="${300 + index}" name="OCR ${index + 1}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                <wps:wsp>
                  <wps:cNvSpPr txBox="1"/>
                  <wps:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    <a:noFill/>
                    <a:ln><a:noFill/></a:ln>
                  </wps:spPr>
                  <wps:txbx>
                  <w:txbxContent>
                    <w:p>
                      <w:r>
                        <w:rPr>
                          <w:color w:val="808080"/>
                          ${showOverlay ? "" : "<w:vanish/>"}
                          <w:sz w:val="${fontSize}"/>
                          <w:szCs w:val="${fontSize}"/>
                          <w:rtl w:val="0"/>
                        </w:rPr>
                        <w:t xml:space="preserve">${text}</w:t>
                      </w:r>
                    </w:p>
                  </w:txbxContent>
                  </wps:txbx>
                  <wps:bodyPr/>
                </wps:wsp>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

async function buildDocxFromModels(pageModels: PageModel[], includePageBreaks = false, addBorders = false): Promise<Uint8Array> {
  const bodyParts: string[] = [];
  const media: Array<{ fileName: string; data: Uint8Array; relId: string }> = [];
  let nextImageIndex = 1;

  const shouldInsertBreak = (currentPage: PageModel, nextPage?: PageModel): boolean => {
    if (!nextPage || !includePageBreaks) return false;
    // Always insert page break between pages to preserve original PDF page separation
    const nextPageIsNotEmpty = nextPage.textBlocks.length > 0 || nextPage.tables.length > 0 || nextPage.images.length > 0 || !!nextPage.backgroundImageDataUrl;
    return nextPageIsNotEmpty;
  };

  for (let index = 0; index < pageModels.length; index++) {
    const pageModel = pageModels[index];
    if (pageModel.mode === "scanned" && pageModel.backgroundImageDataUrl) {
      const dataUrlMatch = pageModel.backgroundImageDataUrl.match(/^data:image\/png;base64,(.*)$/i);
      if (dataUrlMatch?.[1]) {
        const fileName = `scan-bg-${nextImageIndex}.png`;
        const binary = Buffer.from(dataUrlMatch[1], "base64");
        media.push({ fileName, data: new Uint8Array(binary), relId: `rId${nextImageIndex + 1000}` });
        bodyParts.push(backgroundImageXml(pageModel.backgroundImageDataUrl, pageModel.width, pageModel.height, nextImageIndex));
        nextImageIndex += 1;
      }
    }
    if (pageModel.mode !== "scanned") {
      for (const image of pageModel.images) {
        if (image.dataUrl) {
          const dataUrlMatch = image.dataUrl.match(/^data:image\/png;base64,(.*)$/i);
          if (dataUrlMatch?.[1]) {
            const fileName = `image${nextImageIndex}.png`;
            const binary = Buffer.from(dataUrlMatch[1], "base64");
            media.push({ fileName, data: new Uint8Array(binary), relId: `rId${nextImageIndex}` });
            bodyParts.push(imageXml(image, nextImageIndex - 1));
            nextImageIndex += 1;
          }
        }
      }
    }
    if (pageModel.mode === "digital" && pageModel.backgroundImageDataUrl) {
      const dataUrlMatch = pageModel.backgroundImageDataUrl.match(/^data:image\/png;base64,(.*)$/i);
      if (dataUrlMatch?.[1]) {
        const fileName = `digital-bg-${nextImageIndex}.png`;
        const binary = Buffer.from(dataUrlMatch[1], "base64");
        media.push({ fileName, data: new Uint8Array(binary), relId: `rId${nextImageIndex + 1000}` });
        bodyParts.push(backgroundImageXml(pageModel.backgroundImageDataUrl, pageModel.width, pageModel.height, nextImageIndex));
        nextImageIndex += 1;
      }
    }
    if (pageModel.mode === "scanned" && pageModel.ocrTextBoxes?.length) {
      const pageTextBoxes = pageModel.ocrTextBoxes
        .slice(0, 100)
        .map((box, boxIndex) => ocrTextBoxXml(box, boxIndex, pageModel.width, pageModel.height));
      bodyParts.push(...pageTextBoxes);
    }
    for (const field of pageModel.formFields ?? []) {
      bodyParts.push(paragraphXml({
        type: "paragraph",
        text: `${field.name}${field.value ? `: ${field.value}` : ""}`,
        x: field.x,
        y: field.y,
        width: Math.max(120, field.width),
        height: Math.max(12, field.height),
        size: 10,
        bold: field.type === "checkbox" || field.type === "radio",
        italic: field.type === "date",
        underline: false,
        align: "left",
      }));
    }
    // For scanned pages, textBlocks are already positioned as ocrTextBoxes.
    // Do NOT add them again as regular flowing paragraphs.
    if (pageModel.mode !== "scanned") {
      for (const block of pageModel.textBlocks) {
        bodyParts.push(paragraphXml(block));
      }
    }
    for (const table of pageModel.tables) {
      bodyParts.push(tableXml(table));
    }
    const shouldBreak = shouldInsertBreak(pageModel, pageModels[index + 1]);
    if (shouldBreak) {
      bodyParts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }
  }

  const defaultPageWidth = Math.max(...pageModels.map((page) => page.width), 595);
  const defaultPageHeight = Math.max(...pageModels.map((page) => page.height), 842);
  const sectionWidth = pointsToTwips(defaultPageWidth);
  const sectionHeight = pointsToTwips(defaultPageHeight);
  const isLandscape = defaultPageWidth > defaultPageHeight;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
      <w:body>
        ${bodyParts.join("")}
        <w:sectPr>
          <w:pgSz w:w="${sectionWidth}" w:h="${sectionHeight}" ${isLandscape ? 'w:orient="landscape"' : ""}/>${addBorders ? `
          <w:pgBorders w:offsetFrom="page">
            <w:top w:val="single" w:sz="4" w:space="24" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:space="24" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:space="24" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:space="24" w:color="000000"/>
          </w:pgBorders>` : ""}
          <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>
      </w:body>
    </w:document>`;

  const zip = new JSZip();
  const contentTypes = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ...media.map(({ fileName }) => `<Override PartName="/word/media/${fileName}" ContentType="image/png"/>`),
  ].join("");

  const relationshipsXml = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
    ...media.map(({ relId, fileName }) => `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`),
  ].join("");

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${contentTypes}</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Digital Desk India</dc:creator><cp:lastModifiedBy>Digital Desk India</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Digital Desk India PDF to Word</Application></Properties>`);
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-IN" w:eastAsia="en-US" w:bidi="hi-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style></w:styles>`);
  zip.file("word/fontTable.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="Calibri"><w:panose1 w:val="020F0502020204030204"/><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font><w:font w:name="Times New Roman"><w:panose1 w:val="02020603050405020304"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font><w:font w:name="Arial"><w:panose1 w:val="020B0604020202020204"/><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font><w:font w:name="Mangal"><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font></w:fonts>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationshipsXml}</Relationships>`);
  for (const { fileName, data } of media) {
    zip.file(`word/media/${fileName}`, data);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function pdfToWordOutputName(sourceName: string): string {
  const base = sourceName.replace(/\.pdf$/i, "").trim() || "document";
  return `${base}.docx`;
}

export async function pdfToWord(options: PdfToWordOptions): Promise<PdfToWordResult> {
  const { file, mode = "digital", language = "eng", noPageBreaks = false, addBorders = false } = options;

  try {
    validatePdf(file);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(file.buffer ?? []);
    const pdfDoc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

    const resolvedMode = normalizeMode(mode);
    const pageModels: PageModel[] = [];
    const pageClassifications: PageClassificationEntry[] = [];
    let paragraphs = 0;
    let tables = 0;
    let images = 0;
    let words = 0;
    let digitalPages = 0;
    let scannedPages = 0;
    let complexFormPages = 0;
    const warnings: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdfDoc.numPages; pageIndex++) {
      const page = await pdfDoc.getPage(pageIndex);
      let chosenMode = resolvedMode;

      if (resolvedMode === "digital") {
        const classificationResult = await classifyPage(page as unknown as PdfPageLike);
        const features = classificationResult.features;
        pageClassifications.push({
          pageNumber: pageIndex,
          classification: classificationResult.classification,
          nativeTextItems: features.textItems,
          nativeCharacters: features.visibleChars,
          nativeWords: features.nativeWords,
          nativeTextAreaRatio: features.pageArea > 0 ? features.nativeTextArea / features.pageArea : 0,
          imageCount: features.imageCount,
          imageCoverageRatio: features.imageCoverageRatio ?? 0,
          largestImageCoverageRatio: features.largestImageCoverageRatio ?? 0,
          imageDimensions: {
            width: features.largestImageWidth,
            height: features.largestImageHeight,
            aspectRatio: features.largestImageAspectRatio,
          },
          annotationCount: features.annotationCount,
          widgetCount: features.widgetCount,
          reason: classificationResult.reason,
        });
        if (classificationResult.classification === "complex-form") chosenMode = "complex-form";
        if (classificationResult.classification === "scanned-form" || classificationResult.classification === "scanned") chosenMode = "scanned";
        if (classificationResult.classification === "digital") chosenMode = "digital";
      }

      let model: PageModel;
      if (chosenMode === "complex-form") {
        model = await parseComplexFormPage(page as unknown as PdfPageLike, pageIndex);
        complexFormPages += 1;
      } else if (chosenMode === "scanned") {
        model = await parseScannedPage(page as unknown as PdfPageLike, pageIndex, language);
        scannedPages += 1;
      } else {
        model = await parseDigitalPage(page as unknown as PdfPageLike, pageIndex);
        digitalPages += 1;
      }

      for (const block of model.textBlocks) {
        const text = sanitizeText(block.text);
        if (text) {
          paragraphs += 1;
          words += text.split(/\s+/).filter(Boolean).length;
        }
      }

      tables += model.tables.length;
      images += model.images.length;
      if (model.warnings.length) warnings.push(...model.warnings);

      pageModels.push(model);
    }

    const docx = await buildDocxFromModels(pageModels, !noPageBreaks, addBorders);

    return {
      success: true,
      docx,
      outputName: pdfToWordOutputName(file.name),
      message: `Converted ${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? "" : "s"} to editable Word content using ${resolvedMode} mode.`,
      metadata: {
        pages: pdfDoc.numPages,
        mode: resolvedMode,
        language,
        paragraphs,
        scannedPages,
        digitalPages,
        complexFormPages,
        tables,
        images,
        words,
        warnings,
        pageClassifications,
      },
    };
  } catch (error) {
    console.error("[PDF_TO_WORD_ENGINE]", error);
    if (error instanceof ValidationError) throw error;
    return {
      success: false,
      message: error instanceof Error ? `PDF to Word conversion failed: ${error.message}` : "PDF to Word conversion failed.",
    };
  }
}

import { existsSync } from "fs";
import { copyFile, mkdir, readFile } from "fs/promises";
import path from "path";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { OCR_LANGUAGES, type OcrLanguage } from "./ocr-constants.ts";

export { OCR_LANGUAGES };
export type { OcrLanguage } from "./ocr-constants.ts";

export interface OcrPageSummary {
  textItems: number;
  textCharacters: number;
  images: number;
}

export interface OcrProcessOptions {
  fileName: string;
  pdfBytes: Uint8Array;
  languages: OcrLanguage[];
  onProgress?: (message: string, progress: number, currentPage?: number, totalPages?: number) => void;
}

export function normalizeOcrLanguages(input: string | string[] | null | undefined): OcrLanguage[] {
  const values = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const normalized = new Set<OcrLanguage>();

  for (const raw of values) {
    const value = String(raw ?? "").trim().toLowerCase();
    if (!value) continue;

    const candidates = value.includes("+") ? value.split("+") : [value];
    const resolved = candidates
      .map((candidate) => candidate.trim())
      .filter((candidate): candidate is OcrLanguage => OCR_LANGUAGES.includes(candidate as OcrLanguage));

    if (resolved.length) {
      if (resolved.length > 1) {
        const combined = resolved.join("+") as OcrLanguage;
        normalized.add(combined);
      } else {
        normalized.add(resolved[0]);
      }
    }
  }

  if (normalized.size === 0) {
    return ["eng"];
  }

  return Array.from(normalized).filter((language) => OCR_LANGUAGES.includes(language as OcrLanguage));
}

export function createOcrOutputName(fileName: string): string {
  const baseName = fileName.replace(/\.pdf$/i, "") || "document";
  return `${baseName}-ocr.pdf`;
}

export function shouldSkipOcrForPage({ textItems, textCharacters, images }: OcrPageSummary): boolean {
  if (textItems >= 80 && textCharacters >= 250) {
    return true;
  }

  if (textItems >= 40 && textCharacters >= 180 && images === 0) {
    return true;
  }

  if (textItems <= 6 && textCharacters <= 35 && images > 0) {
    return false;
  }

  return false;
}

async function ensureTessdata(): Promise<string> {
  const rootDir = process.cwd();
  const tessdataDir = path.join(rootDir, "storage", "tessdata");
  await mkdir(tessdataDir, { recursive: true });

  const modelNames = ["eng.traineddata", "hin.traineddata"];

  for (const modelName of modelNames) {
    const targetPath = path.join(tessdataDir, modelName);
    if (!existsSync(targetPath)) {
      const candidates = [
        path.join(rootDir, modelName),
        path.join(rootDir, "storage", modelName),
        path.join(rootDir, "storage", "tessdata", modelName),
      ];

      const sourcePath = candidates.find((candidate) => existsSync(candidate));
      if (sourcePath) {
        await copyFile(sourcePath, targetPath);
      }
    }
  }

  return tessdataDir;
}

type PdfPageLikeForOcr = {
  rotate?: number;
  getViewport: (options: { scale?: number; rotation?: number; offsetX?: number; offsetY?: number; dontFlip?: boolean }) => { width: number; height: number };
  render: (options: { canvasContext: unknown; viewport: { width: number; height: number }; canvas?: unknown }) => { promise: Promise<void> };
};

async function pdfPageToPng(page: PdfPageLikeForOcr): Promise<Uint8Array> {
  const viewport = page.getViewport({ scale: 1.8, rotation: page.rotate ?? 0 });
  const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
  const context = canvas.getContext("2d");

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;

  return new Uint8Array(canvas.toBuffer("image/png"));
}

async function rotatePng(image: Uint8Array, degrees: 90 | 180 | 270): Promise<Uint8Array> {
  const source = await loadImage(image);
  const quarterTurn = degrees === 90 || degrees === 270;
  const canvas = createCanvas(quarterTurn ? source.height : source.width, quarterTurn ? source.width : source.height);
  const context = canvas.getContext("2d");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return new Uint8Array(canvas.toBuffer("image/png"));
}

function mapRotatedWords(
  words: Array<{ text: string; x0: number; y0: number; x1: number; y1: number }>,
  degrees: 90 | 180 | 270,
  width: number,
  height: number
) {
  return words.map((word) => {
    if (degrees === 90) {
      return { ...word, x0: height - word.y1, y0: word.x0, x1: height - word.y0, y1: word.x1 };
    }
    if (degrees === 180) {
      return { ...word, x0: width - word.x1, y0: height - word.y1, x1: width - word.x0, y1: height - word.y0 };
    }
    return { ...word, x0: word.y0, y0: width - word.x1, x1: word.y1, y1: width - word.x0 };
  });
}

function ocrWordScore(words: Array<{ text: string }>): number {
  return words.reduce((total, word) => total + word.text.length, 0);
}

function collectWords(data: Record<string, unknown>): Array<{ text: string; x0: number; y0: number; x1: number; y1: number }> {
  const repeatWords: Array<{ text: string; x0: number; y0: number; x1: number; y1: number }> = [];
  const rawWords = Array.isArray(data.words)
    ? data.words
    : Array.isArray(data.lines)
      ? (data.lines as Array<Record<string, unknown>>).flatMap((line) => (Array.isArray(line.words) ? line.words : []))
      : Array.isArray(data.blocks)
        ? (data.blocks as Array<Record<string, unknown>>).flatMap((block) =>
            ((Array.isArray(block.paragraphs) ? block.paragraphs : []) as Array<Record<string, unknown>>).flatMap((paragraph) =>
              ((Array.isArray(paragraph.lines) ? paragraph.lines : []) as Array<Record<string, unknown>>).flatMap((line) =>
                Array.isArray(line.words) ? line.words : []
              )
            )
          )
        : [];

  const normalizedWords = Array.isArray(rawWords) ? rawWords : [];

  for (const word of normalizedWords) {
    const text = String((word as { text?: string }).text ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const bbox = (word as { bbox?: { x0?: number; y0?: number; x1?: number; y1?: number }; x0?: number; y0?: number; x1?: number; y1?: number })
    const x0 = Number(bbox?.bbox?.x0 ?? bbox?.x0 ?? 0);
    const y0 = Number(bbox?.bbox?.y0 ?? bbox?.y0 ?? 0);
    const x1 = Number(bbox?.bbox?.x1 ?? bbox?.x1 ?? x0 + text.length * 12);
    const y1 = Number(bbox?.bbox?.y1 ?? bbox?.y1 ?? y0 + 18);

    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
      continue;
    }

    repeatWords.push({ text, x0, y0, x1, y1 });
  }

  return repeatWords;
}

async function ocrRecognizePage(image: Uint8Array, languages: OcrLanguage[]): Promise<{ words: Array<{ text: string; x0: number; y0: number; x1: number; y1: number }>; nativePdf?: Uint8Array }> {
  const { createWorker } = await import("tesseract.js");
  const tessDataDir = await ensureTessdata();
  const languageCode = languages.length > 1 ? languages.join("+") : languages[0];
  const worker = await createWorker(languageCode, 1, {
    langPath: tessDataDir,
    cachePath: path.join(process.cwd(), "storage", ".ocr-cache"),
  });

  try {
    const recognize = (imageData: Uint8Array) =>
      (worker as unknown as {
        recognize: (input: Uint8Array, options?: Record<string, unknown>, config?: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
      }).recognize(imageData, {}, { blocks: true });

    const firstData = (await (worker as unknown as {
      recognize: (input: Uint8Array, options?: Record<string, unknown>, config?: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
    }).recognize(image, {}, { blocks: true, pdf: languages.includes("hin") || languages.includes("eng+hin") })).data ?? {};
    const firstResult = collectWords(firstData);
    const firstConfidence = Number(firstData.confidence ?? 0);
    const nativePdf = firstData.pdf instanceof Uint8Array ? firstData.pdf : undefined;
    if (ocrWordScore(firstResult) >= 40 && firstConfidence >= 70) return { words: firstResult, nativePdf };

    const source = await loadImage(image);
    let bestResult = firstResult;
    let bestScore = firstConfidence * ocrWordScore(firstResult);
    for (const degrees of [90, 180, 270] as const) {
      const rotatedData = (await recognize(await rotatePng(image, degrees))).data ?? {};
      const rotatedWords = collectWords(rotatedData);
      const score = Number(rotatedData.confidence ?? 0) * ocrWordScore(rotatedWords);
      if (score > bestScore) {
        bestResult = mapRotatedWords(rotatedWords, degrees, source.width, source.height);
        bestScore = score;
      }
    }

    return { words: bestResult, nativePdf };
  } finally {
    await worker.terminate();
  }
}

export async function processPdfOcr({ fileName, pdfBytes, languages, onProgress }: OcrProcessOptions): Promise<{ bytes: Uint8Array; pages: number; ocrPages: number; skippedPages: number; warnings: string[]; language: string }> {
  const normalized = normalizeOcrLanguages(languages);
  const pdfjsBytes = new Uint8Array(pdfBytes);
  const pdf = await getDocument({ data: pdfjsBytes, useSystemFonts: true }).promise;
  const sourcePdf = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true, updateMetadata: false });
  const outputPdf = await PDFDocument.create();
  outputPdf.registerFontkit(fontkit);
  const warnings: string[] = [];
  let ocrPages = 0;
  let skippedPages = 0;

  const fontPath = path.join(process.cwd(), "lib", "pdf", "fonts", "NotoSansDevanagari.ttf");
  const fontBytes = existsSync(fontPath) ? await readFile(fontPath) : null;
  const baseFont = fontBytes ? await outputPdf.embedFont(fontBytes) : null;

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const textItems = (textContent.items ?? []).filter((item) => {
      if (typeof item !== "object" || item === null || !("str" in item)) {
        return false;
      }

      const value = (item as { str?: unknown }).str;
      return typeof value === "string" && value.trim().length > 0;
    }) as Array<{ str: string }>;
    const textCharacters = textItems.reduce((sum, item) => sum + item.str.length, 0);
    const shouldSkip = shouldSkipOcrForPage({ textItems: textItems.length, textCharacters, images: 0 });

    if (shouldSkip) {
      skippedPages += 1;
      const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageIndex - 1]);
      outputPdf.addPage(copiedPage);
      onProgress?.(`Preserving existing searchable page ${pageIndex} of ${pdf.numPages}`, Math.round((pageIndex / pdf.numPages) * 100), pageIndex, pdf.numPages);
      continue;
    }

    onProgress?.(`Rendering page ${pageIndex} of ${pdf.numPages} for OCR`, Math.min(95, Math.round((pageIndex / pdf.numPages) * 80)), pageIndex, pdf.numPages);
    const png = await pdfPageToPng(page as unknown as PdfPageLikeForOcr);
    const recognized = await ocrRecognizePage(png, normalized);

    if (recognized.nativePdf && normalized.some((language) => language === "hin" || language === "eng+hin")) {
      const nativePdf = await PDFDocument.load(new Uint8Array(recognized.nativePdf), { ignoreEncryption: true, updateMetadata: false });
      const [nativePage] = await outputPdf.copyPages(nativePdf, [0]);
      outputPdf.addPage(nativePage);
      if (recognized.words.length === 0) warnings.push(`No searchable text recognized on page ${pageIndex}.`);
      else ocrPages += 1;
      onProgress?.(`Completed OCR for page ${pageIndex} of ${pdf.numPages}`, Math.min(99, Math.round((pageIndex / pdf.numPages) * 100)), pageIndex, pdf.numPages);
      continue;
    }

    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageIndex - 1]);
    outputPdf.addPage(copiedPage);

    if (recognized.words.length === 0) {
      warnings.push(`No searchable text recognized on page ${pageIndex}.`);
      onProgress?.(`Page ${pageIndex} finished without OCR text`, Math.min(98, Math.round((pageIndex / pdf.numPages) * 100)), pageIndex, pdf.numPages);
      continue;
    }

    ocrPages += 1;
    const pageWidth = copiedPage.getWidth();
    const pageHeight = copiedPage.getHeight();
    const viewport = page.getViewport({ scale: 1.8, rotation: page.rotate ?? 0 });
    const scaleX = pageWidth / Math.max(1, viewport.width);
    const scaleY = pageHeight / Math.max(1, viewport.height);

    const orderedWords: typeof recognized.words = [];
    const lines: Array<{ words: typeof recognized.words; centerY: number }> = [];
    for (const word of [...recognized.words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
      const centerY = (word.y0 + word.y1) / 2;
      const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= Math.max(24, (word.y1 - word.y0) * 0.35));
      if (line) {
        line.words.push(word);
        line.centerY = line.words.reduce((sum, item) => sum + (item.y0 + item.y1) / 2, 0) / line.words.length;
      } else {
        lines.push({ words: [word], centerY });
      }
    }
    for (const line of lines.sort((a, b) => a.centerY - b.centerY)) {
      orderedWords.push(...line.words.sort((a, b) => a.x0 - b.x0));
    }
    const font = baseFont ?? (await outputPdf.embedFont(StandardFonts.Helvetica));

    for (const word of orderedWords) {
      const text = String(word.text ?? "").trim();
      if (!text) continue;

      const x = Math.max(4, word.x0 * scaleX);
      const y = Math.max(4, pageHeight - word.y1 * scaleY);
      const height = Math.max(8, (word.y1 - word.y0) * scaleY * 0.9);

      try {
        copiedPage.drawText(text, {
          x,
          y,
          size: Math.max(8, height),
          font,
          color: rgb(0, 0, 0),
          opacity: 0.001,
        });
      } catch {
        // Ignore individual word draw failures so the rest of the page can be processed.
      }
    }

    onProgress?.(`Completed OCR for page ${pageIndex} of ${pdf.numPages}`, Math.min(99, Math.round((pageIndex / pdf.numPages) * 100)), pageIndex, pdf.numPages);
  }

  const outputBytes = Buffer.from(await outputPdf.save());
  const outputName = createOcrOutputName(fileName);
  onProgress?.("Finalizing searchable PDF", 100, pdf.numPages, pdf.numPages);

  return {
    bytes: new Uint8Array(outputBytes),
    pages: pdf.numPages,
    ocrPages,
    skippedPages,
    warnings,
    language: normalized.join("+"),
  };
}

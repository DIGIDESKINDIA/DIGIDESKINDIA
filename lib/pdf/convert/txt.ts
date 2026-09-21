import fs from "fs/promises";
import { createReadStream } from "fs";
import crypto from "crypto";
import path from "path";
import readline from "readline";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";

import { ConvertOptions, ConvertResult } from "../types";

const OUTPUT_DIR = "storage/output";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_PATH = path.join(process.cwd(), "lib", "pdf", "fonts", "NotoSansDevanagari.ttf");

function widthOf(text: string, font: PDFFont): number {
  return font.widthOfTextAtSize(text, FONT_SIZE);
}

function wrapLine(line: string, font: PDFFont): string[] {
  if (!line) return [""];
  const wrapped: string[] = [];
  let current = "";
  for (const character of line) {
    const candidate = current + character;
    if (current && widthOf(candidate, font) > CONTENT_WIDTH) {
      wrapped.push(current);
      current = character;
    } else current = candidate;
  }
  if (current) wrapped.push(current);
  return wrapped;
}

function drawLine(page: PDFPage, line: string, y: number, font: PDFFont): void {
  page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0.08, 0.1, 0.14) });
}

export async function txtToPDF(options: ConvertOptions): Promise<ConvertResult> {
  let outputPath: string | undefined;
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const document = await PDFDocument.create();
    document.registerFontkit(fontkit);
    const font = await document.embedFont(await fs.readFile(FONT_PATH));
    let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN - FONT_SIZE;
    let firstLine = true;
    const input = createReadStream(options.input.path, { encoding: "utf8" });
    const lines = readline.createInterface({ input, crlfDelay: Infinity });

    for await (const rawLine of lines) {
      const line = firstLine ? rawLine.replace(/^\ufeff/, "") : rawLine;
      firstLine = false;
      for (const wrappedLine of wrapLine(line, font)) {
        if (y < MARGIN) {
          page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN - FONT_SIZE;
        }
        drawLine(page, wrappedLine, y, font);
        y -= LINE_HEIGHT;
      }
    }
    lines.close();

    const bytes = await document.save();
    const outputName = `${path.basename(options.input.name, path.extname(options.input.name)) || "document"}.pdf`;
    outputPath = path.join(OUTPUT_DIR, `${crypto.randomUUID()}-${outputName}`);
    await fs.writeFile(outputPath, bytes);
    return { success: true, outputPath, outputName, message: "TXT converted to PDF." };
  } catch (error) {
    console.error("[TXT_TO_PDF_ERROR]", error);
    if (outputPath) await fs.rm(outputPath, { force: true }).catch(() => undefined);
    return { success: false, message: error instanceof Error ? error.message : "TXT conversion failed." };
  }
}
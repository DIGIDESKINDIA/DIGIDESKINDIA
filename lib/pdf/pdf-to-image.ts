import { PdfToImageOptions } from "./types";
import { ValidationError } from "./errors";
import { validatePdf } from "./validation";
import { PDFDocument } from "pdf-lib";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";

/**
 * Placeholder interface for future renderer.
 * Current implementation is renderer-agnostic.
 *
 * Recommended production renderer:
 * - pdfjs-dist + @napi-rs/canvas
 * OR
 * - pdf-poppler (Linux)
 * OR
 * - MuPDF
 */

export interface PdfImage {
  page: number;
  filename: string;
  mimeType: "image/png" | "image/jpeg";
  buffer: Uint8Array;
}

const execFileAsync = promisify(execFile);

async function findGhostscript(): Promise<string> {
  const configured = process.env.GHOSTSCRIPT_PATH?.trim();
  if (configured) {
    try {
      await stat(configured);
      return configured;
    } catch {}
  }

  for (const command of process.platform === "win32" ? ["gswin64c.exe", "gswin32c.exe"] : ["gs"]) {
    try {
      await execFileAsync(command, ["-version"], { windowsHide: true, timeout: 10000 });
      return command;
    } catch {}
  }

  throw new ValidationError("Ghostscript is required for PDF to image conversion. Install Ghostscript or set GHOSTSCRIPT_PATH.");
}

async function renderPageWithGhostscript({
  ghostscript,
  inputPdf,
  outputFile,
  page,
  quality,
  dpi,
  format,
}: {
  ghostscript: string;
  inputPdf: string;
  outputFile: string;
  page: number;
  quality: number;
  dpi: number;
  format: "jpeg" | "png";
}) {
  const device =
    format === "png"
      ? "png16m"
      : "jpeg";

  const args = [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-dQUIET",

    `-sDEVICE=${device}`,

    `-r${dpi}`,

    "-dTextAlphaBits=4",
    "-dGraphicsAlphaBits=4",

    `-dFirstPage=${page}`,
    `-dLastPage=${page}`,
  ];

  if (format === "jpeg") {
    args.push(`-dJPEGQ=${quality}`);
  }

  args.push(
    `-sOutputFile=${outputFile}`,
    inputPdf
  );

  await execFileAsync(ghostscript, args, {
    windowsHide: true,
    timeout: 180000,
    maxBuffer: 20 * 1024 * 1024,
  });
}

export async function pdfToImages({
  file,
  format = "png",
  quality = 100,
  pages,
  scale = 1.5,
}: PdfToImageOptions): Promise<PdfImage[]> {
  validatePdf(file);

  if (
    quality < 1 ||
    quality > 100
  ) {
    throw new ValidationError(
      "Image quality must be between 1 and 100."
    );
  }

  if (
    !Number.isFinite(scale) ||
    scale <= 0 ||
    scale > 4
  ) {
    throw new ValidationError(
      "Scale must be between 0.1 and 4."
    );
  }

  const normalizedFormat =
    format === "jpg"
      ? "jpeg"
      : format;

  if (
    normalizedFormat !== "jpeg" &&
    normalizedFormat !== "png"
  ) {
    throw new ValidationError(
      "Unsupported output format."
    );
  }

  const sourceBytes =
    file.buffer instanceof Uint8Array
      ? file.buffer
      : new Uint8Array(file.buffer ?? []);

  if (!sourceBytes.length) {
    throw new ValidationError(
      `"${file.name}" has no data.`
    );
  }

  const pdf =
    await PDFDocument.load(sourceBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

  const pageCount = pdf.getPageCount();

  const selectedPages =
    (pages ?? [])
      .filter((page) =>
        Number.isInteger(page)
      )
      .filter(
        (page) =>
          page >= 1 &&
          page <= pageCount
      );

  const pageNumbers =
    selectedPages.length > 0
      ? Array.from(
          new Set(selectedPages)
        ).sort((a, b) => a - b)
      : Array.from(
          {
            length: pageCount,
          },
          (_, index) => index + 1
        );

  if (!pageNumbers.length) {
    throw new ValidationError(
      "No valid pages selected."
    );
  }

  const dpi = Math.max(
    72,
    Math.min(
      600,
      Math.round(144 * scale)
    )
  );

  const ghostscript = await findGhostscript();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "digital-desk-pdf-to-image-"));
  const output: PdfImage[] = [];

  try {
    const inputPdf = path.join(tempRoot, "input.pdf");
    await writeFile(inputPdf, sourceBytes);

    for (const pageNumber of pageNumbers) {
      const ext = normalizedFormat === "png" ? "png" : "jpg";
      const filename = `page-${String(pageNumber).padStart(3, "0")}.${ext}`;
      const outputFile = path.join(tempRoot, filename);
      await renderPageWithGhostscript({
        ghostscript,
        inputPdf,
        outputFile,
      page: pageNumber,
      quality,
      dpi,
        format: normalizedFormat,
      });
      const buffer = await readFile(outputFile);

    output.push({
      page: pageNumber,
      filename,
      mimeType: normalizedFormat === "png" ? "image/png" : "image/jpeg",
        buffer: new Uint8Array(buffer),
      });
    }

    return output;
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}
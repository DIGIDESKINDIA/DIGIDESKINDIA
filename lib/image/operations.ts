import sharp, { type OverlayOptions, type Sharp } from "sharp";
import { spawn } from "node:child_process";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { ValidationError } from "@/lib/pdf/errors";

import {
  clamp,
  detectImageFormat,
  formatToExtension,
  formatToMime,
  getBaseName,
  toPositiveInteger,
  type ImageFormat,
  type ImageUploadFile,
  validateImageFile,
} from "./validation";

type ImageDownloadResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  format: ImageFormat;
  originalSize: number;
  outputSize: number;
};

type ResizeOptions = {
  width?: number;
  height?: number;
};

type CropOptions = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type WatermarkOptions = {
  text: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

type RotateOptions = {
  angle: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
};

export type PassportOutputFormat = "jpg" | "pdf";

type PassportPhotoOptions = {
  file: ImageUploadFile;
  outputFormat: PassportOutputFormat;
  target: "india-passport" | "india-visa";
  copies: number;
  yOffset: number;
  quality?: number;
};

type PassportPhotoResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  copiesPlaced: number;
  sheetWidth: number;
  sheetHeight: number;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeColor(color?: string): string {
  const fallback = "#ffffff";

  if (!color) {
    return fallback;
  }

  const normalized = color.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(normalized) || /^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function getOutputSuffix(format: ImageFormat): string {
  return formatToExtension(format);
}

function buildOutputName(fileName: string, suffix: string, format: ImageFormat): string {
  return `${getBaseName(fileName)}-${suffix}.${getOutputSuffix(format)}`;
}

function qualityToPngCompressionLevel(quality: number): number {
  const normalized = clamp(quality, 10, 100);

  return clamp(Math.round((100 - normalized) / 10), 0, 9);
}

function isAvifOutputSupported(): boolean {
  const formatMap = sharp.format as unknown as Record<
    string,
    {
      output?: {
        file?: boolean;
      };
    }
  >;

  return Boolean(formatMap.avif?.output?.file);
}

export function getSupportedOutputFormats(): ImageFormat[] {
  const formats: ImageFormat[] = ["jpeg", "png", "webp"];

  if (isAvifOutputSupported()) {
    formats.push("avif");
  }

  return formats;
}

function ensureOutputFormatSupported(format: ImageFormat): void {
  if (format === "avif" && !isAvifOutputSupported()) {
    throw new ValidationError("AVIF output is not supported in this runtime.");
  }
}

async function encodeToFormat(
  pipeline: Sharp,
  format: ImageFormat,
  quality: number
): Promise<Buffer> {
  const normalizedQuality = clamp(quality, 10, 95);

  if (format === "png") {
    return pipeline
      .png({
        compressionLevel: qualityToPngCompressionLevel(normalizedQuality),
        palette: true,
        effort: 9,
      })
      .toBuffer();
  }

  if (format === "webp") {
    return pipeline
      .webp({
        quality: normalizedQuality,
      })
      .toBuffer();
  }

  if (format === "avif") {
    ensureOutputFormatSupported(format);

    return pipeline
      .avif({
        quality: normalizedQuality,
        effort: 4,
      })
      .toBuffer();
  }

  return pipeline
    .flatten({
      background: "#ffffff",
    })
    .jpeg({
      quality: normalizedQuality,
      mozjpeg: true,
    })
    .toBuffer();
}

function getImagePipeline(input: ImageUploadFile) {
  validateImageFile(input);

  return sharp(input.buffer);
}

export async function compressImageFile(
  input: ImageUploadFile,
  quality = 80,
  outputFormat?: ImageFormat
): Promise<ImageDownloadResult> {
  const format = outputFormat ?? detectImageFormat(input);
  ensureOutputFormatSupported(format);
  const pipeline = getImagePipeline(input);

  const output = await encodeToFormat(pipeline, format, quality);

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "compressed", format),
    contentType: formatToMime(format),
    format,
    originalSize: input.size,
    outputSize: output.length,
  };
}

export async function resizeImageFile(
  input: ImageUploadFile,
  options: ResizeOptions
): Promise<ImageDownloadResult> {
  const format = detectImageFormat(input);
  const pipeline = getImagePipeline(input);

  const width = options.width && options.width > 0 ? Math.floor(options.width) : undefined;
  const height = options.height && options.height > 0 ? Math.floor(options.height) : undefined;

  if (!width && !height) {
    throw new ValidationError("Width or height is required.");
  }

  const output = await pipeline
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "resized", format),
    contentType: formatToMime(format),
    format,
    originalSize: input.size,
    outputSize: output.length,
  };
}

export async function cropImageFile(
  input: ImageUploadFile,
  options: CropOptions
): Promise<ImageDownloadResult> {
  const format = detectImageFormat(input);
  const pipeline = getImagePipeline(input);
  const metadata = await pipeline.metadata();

  const left = toPositiveInteger(options.left + 1, "X position") - 1;
  const top = toPositiveInteger(options.top + 1, "Y position") - 1;
  const width = toPositiveInteger(options.width, "Crop width");
  const height = toPositiveInteger(options.height, "Crop height");

  if (!metadata.width || !metadata.height) {
    throw new ValidationError("Unable to read image dimensions.");
  }

  if (left + width > metadata.width || top + height > metadata.height) {
    throw new ValidationError("Crop area exceeds the image bounds.");
  }

  const output = await pipeline
    .extract({
      left,
      top,
      width,
      height,
    })
    .toBuffer();

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "cropped", format),
    contentType: formatToMime(format),
    format,
    originalSize: input.size,
    outputSize: output.length,
  };
}

export async function rotateImageFile(
  input: ImageUploadFile,
  options: RotateOptions
): Promise<ImageDownloadResult> {
  const format = detectImageFormat(input);
  const rotation = Number(options.angle);

  if (!Number.isFinite(rotation)) {
    throw new ValidationError("Rotation angle is required.");
  }

  const output = await getImagePipeline(input)
    .rotate(rotation)
    .flop(Boolean(options.flipHorizontal))
    .flip(Boolean(options.flipVertical))
    .toBuffer();

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "rotated", format),
    contentType: formatToMime(format),
    format,
    originalSize: input.size,
    outputSize: output.length,
  };
}

export async function convertImageFile(
  input: ImageUploadFile,
  targetFormat: ImageFormat,
  quality = 85
): Promise<ImageDownloadResult> {
  const pipeline = getImagePipeline(input);
  ensureOutputFormatSupported(targetFormat);
  const output = await encodeToFormat(pipeline, targetFormat, quality);

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "converted", targetFormat),
    contentType: formatToMime(targetFormat),
    format: targetFormat,
    originalSize: input.size,
    outputSize: output.length,
  };
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeColor(hex).slice(1);

  const expanded = normalized.length === 3
    ? normalized.split("").map((value) => value + value).join("")
    : normalized;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function createWatermarkSvg(
  width: number,
  height: number,
  options: Required<Pick<WatermarkOptions, "text" | "opacity" | "fontSize" | "color" | "position">>
): string {
  const color = normalizeColor(options.color);
  const { r, g, b } = parseHexColor(color);
  const fill = `rgba(${r},${g},${b},${clamp(options.opacity, 0.05, 1)})`;

  const margin = Math.max(24, Math.round(options.fontSize * 0.75));

  const positionMap = {
    center: {
      x: width / 2,
      y: height / 2,
      anchor: "middle",
      baseline: "middle",
    },
    "top-left": {
      x: margin,
      y: margin + options.fontSize,
      anchor: "start",
      baseline: "hanging",
    },
    "top-right": {
      x: width - margin,
      y: margin + options.fontSize,
      anchor: "end",
      baseline: "hanging",
    },
    "bottom-left": {
      x: margin,
      y: height - margin,
      anchor: "start",
      baseline: "alphabetic",
    },
    "bottom-right": {
      x: width - margin,
      y: height - margin,
      anchor: "end",
      baseline: "alphabetic",
    },
  } as const;

  const position = positionMap[options.position];

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
      </style>
      <text x="${position.x}" y="${position.y}" text-anchor="${position.anchor}" dominant-baseline="${position.baseline}" font-size="${options.fontSize}" fill="${fill}">${escapeXml(options.text)}</text>
    </svg>
  `;
}

export async function watermarkImageFile(
  input: ImageUploadFile,
  options: WatermarkOptions
): Promise<ImageDownloadResult> {
  if (!options.text.trim()) {
    throw new ValidationError("Watermark text is required.");
  }

  const format = detectImageFormat(input);
  const pipeline = getImagePipeline(input);
  const metadata = await pipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new ValidationError("Unable to read image dimensions.");
  }

  const svg = Buffer.from(
    createWatermarkSvg(metadata.width, metadata.height, {
      text: options.text.trim(),
      opacity: options.opacity ?? 0.25,
      fontSize: options.fontSize ?? 42,
      color: options.color ?? "#ffffff",
      position: options.position ?? "center",
    })
  );

  let outputPipeline = pipeline.composite([
    {
      input: svg,
      blend: "over",
    },
  ]);

  if (format === "jpeg") {
    outputPipeline = outputPipeline.flatten({
      background: "#ffffff",
    });
  }

  if (format === "avif") {
    ensureOutputFormatSupported(format);
  }

  const output = await outputPipeline
    .toFormat(format, format === "jpeg" || format === "webp" || format === "avif"
      ? {
          quality: 92,
        }
      : undefined)
    .toBuffer();

  return {
    buffer: output,
    fileName: buildOutputName(input.name, "watermarked", format),
    contentType: formatToMime(format),
    format,
    originalSize: input.size,
    outputSize: output.length,
  };
}

export async function imageFilesToPdf(
  files: ImageUploadFile[]
): Promise<Buffer> {
  if (!files.length) {
    throw new ValidationError("At least one image is required.");
  }

  const pdf = await PDFDocument.create();

  for (const file of files) {
    validateImageFile(file);

    const imageBuffer = Buffer.from(file.buffer);
    const format = detectImageFormat(file);
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new ValidationError(`Unable to read dimensions for ${file.name}.`);
    }

    let embeddedImage;

    if (format === "jpeg") {
      embeddedImage = await pdf.embedJpg(imageBuffer);
    } else {
      const pngBuffer = await sharp(imageBuffer).png().toBuffer();
      embeddedImage = await pdf.embedPng(pngBuffer);
    }

    const page = pdf.addPage([
      metadata.width,
      metadata.height,
    ]);

    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: metadata.width,
      height: metadata.height,
    });
  }

  return Buffer.from(
    await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    })
  );
}

type BackgroundRemovalResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  originalSize: number;
  outputSize: number;
};

type BackgroundRemovalOptions = {
  // Kept for API compatibility. Segmentation is model-driven rather than RGB-threshold-driven.
  tolerance?: number;
};

/**
 * Validate the invariants that protect against the previous corruption mode:
 * the result must be RGBA, retain a non-empty subject, and never alter the
 * source RGB values while applying the segmentation alpha.
 */
async function validateBackgroundRemovalOutput(
  source: Buffer,
  output: Buffer,
  width: number,
  height: number
): Promise<void> {
  const sourcePixels = sharp(source).ensureAlpha();
  const outputPixels = sharp(output).ensureAlpha();

  const [sourceRaw, outputRaw] = await Promise.all([
    sourcePixels.raw().toBuffer(),
    outputPixels.raw().toBuffer(),
  ]);
      if (outputRaw.length !== width * height * 4) {
        throw new ValidationError("Background removal did not produce an RGBA image.");
      }

      let opaquePixels = 0;
      let nonTransparentPixels = 0;
      let changedForegroundRgb = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      let opaqueBorderPixels = 0;
      let borderPixels = 0;

      for (let index = 0; index < width * height; index++) {
        const offset = index * 4;
        const alpha = outputRaw[offset + 3];
        const x = index % width;
        const y = Math.floor(index / width);

        if (alpha > 0) {
          nonTransparentPixels++;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
        if (alpha >= 250) {
          opaquePixels++;
          if (
            outputRaw[offset] !== sourceRaw[offset] ||
            outputRaw[offset + 1] !== sourceRaw[offset + 1] ||
            outputRaw[offset + 2] !== sourceRaw[offset + 2]
          ) {
            changedForegroundRgb++;
          }
        }

        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          borderPixels++;
          if (alpha >= 250) opaqueBorderPixels++;
        }
      }

      if (!nonTransparentPixels || !opaquePixels) {
        throw new ValidationError("Background segmentation did not detect a foreground subject.");
      }

      if (maxX < minX || maxY < minY || (maxX - minX + 1) * (maxY - minY + 1) < width * height * 0.01) {
        throw new ValidationError("Background segmentation produced an incomplete subject mask.");
      }

      if (opaqueBorderPixels > borderPixels * 0.2) {
        throw new ValidationError("Background segmentation left a large opaque background region.");
      }

      if (changedForegroundRgb > 0) {
        throw new ValidationError("Background removal changed foreground RGB pixels.");
      }
}

function runForegroundSegmentation(source: Buffer): Promise<Buffer> {
  const workerPath = path.join(process.cwd(), "scripts", "background-segmentation-worker.mjs");

  return new Promise((resolve, reject) => {
    const worker = spawn(process.execPath, [workerPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    worker.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    worker.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    worker.on("error", reject);
    worker.on("close", (code) => {
      if (code !== 0) {
        reject(new ValidationError(`Foreground segmentation failed: ${Buffer.concat(stderr).toString("utf8").slice(-500)}`));
        return;
      }

      try {
        resolve(Buffer.from(Buffer.concat(stdout).toString("utf8").trim(), "base64"));
      } catch {
        reject(new ValidationError("Foreground segmentation returned an invalid mask."));
      }
    });

    worker.stdin.end(source.toString("base64"));
  });
}

export async function removeImageBackground(
  input: ImageUploadFile,
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
  validateImageFile(input);

  void options;
  const buffer = Buffer.from(input.buffer);
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new ValidationError("Unable to read image dimensions.");
  }

  const segmentedOutput = await runForegroundSegmentation(buffer);
  const expectedRawBytes = metadata.width * metadata.height * 4;
  if (segmentedOutput.length !== expectedRawBytes) {
    throw new ValidationError("Foreground segmentation returned an invalid RGBA image.");
  }

  const output = await sharp(segmentedOutput, {
    raw: { width: metadata.width, height: metadata.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false, adaptiveFiltering: false })
    .toBuffer();

  const outputMetadata = await sharp(output).metadata();
  if (
    outputMetadata.width !== metadata.width ||
    outputMetadata.height !== metadata.height ||
    outputMetadata.channels !== 4 ||
    outputMetadata.hasAlpha !== true ||
    outputMetadata.isPalette === true
  ) {
    throw new ValidationError("Background removal output is not a true RGBA PNG.");
  }

  await validateBackgroundRemovalOutput(buffer, output, metadata.width, metadata.height);

  return {
    buffer: output,
    fileName: `${getBaseName(input.name)}-nobg.png`,
    contentType: "image/png",
    originalSize: input.size,
    outputSize: output.length,
  };
}

type PassportTargetConfig = {
  label: string;
  widthMm: number;
  heightMm: number;
};

const MM_PER_INCH = 25.4;
const DEFAULT_DPI = 300;

const PASSPORT_TARGETS: Record<PassportPhotoOptions["target"], PassportTargetConfig> = {
  "india-passport": {
    label: "India Passport (35x45 mm)",
    widthMm: 35,
    heightMm: 45,
  },
  "india-visa": {
    label: "India Visa (51x51 mm)",
    widthMm: 51,
    heightMm: 51,
  },
};

function mmToPixels(mm: number): number {
  return Math.max(1, Math.round((mm / MM_PER_INCH) * DEFAULT_DPI));
}

function createPassportSheetLayout(photoWidth: number, photoHeight: number, copies: number) {
  const sheetWidth = 1200;
  const sheetHeight = 1800;
  const margin = 60;
  const gap = 24;

  const cols = Math.max(1, Math.floor((sheetWidth - margin * 2 + gap) / (photoWidth + gap)));
  const rows = Math.max(1, Math.floor((sheetHeight - margin * 2 + gap) / (photoHeight + gap)));
  const maxCopies = cols * rows;
  const copyCount = Math.max(1, Math.min(copies, maxCopies));

  return {
    sheetWidth,
    sheetHeight,
    margin,
    gap,
    cols,
    rows,
    copyCount,
  };
}

function cropToAspect(metadataWidth: number, metadataHeight: number, targetAspect: number, yOffset: number) {
  const inputAspect = metadataWidth / metadataHeight;

  if (inputAspect > targetAspect) {
    const cropHeight = metadataHeight;
    const cropWidth = Math.round(cropHeight * targetAspect);
    const left = Math.max(0, Math.floor((metadataWidth - cropWidth) / 2));

    return {
      left,
      top: 0,
      width: cropWidth,
      height: cropHeight,
    };
  }

  const cropWidth = metadataWidth;
  const cropHeight = Math.round(cropWidth / targetAspect);
  const freeSpace = Math.max(0, metadataHeight - cropHeight);
  const offsetRatio = clamp(yOffset, -100, 100) / 100;
  const top = Math.max(0, Math.min(freeSpace, Math.floor(freeSpace * (0.5 + offsetRatio * 0.5))));

  return {
    left: 0,
    top,
    width: cropWidth,
    height: cropHeight,
  };
}

export async function createPassportPhotoSheet(
  options: PassportPhotoOptions
): Promise<PassportPhotoResult> {
  validateImageFile(options.file);

  const target = PASSPORT_TARGETS[options.target] ?? PASSPORT_TARGETS["india-passport"];

  const photoWidth = mmToPixels(target.widthMm);
  const photoHeight = mmToPixels(target.heightMm);
  const quality = clamp(options.quality ?? 92, 60, 100);

  const source = sharp(Buffer.from(options.file.buffer));
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height) {
    throw new ValidationError("Unable to read image dimensions.");
  }

  const cropRegion = cropToAspect(
    metadata.width,
    metadata.height,
    photoWidth / photoHeight,
    options.yOffset
  );

  const photoBuffer = await source
    .extract(cropRegion)
    .resize(photoWidth, photoHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({
      quality,
      mozjpeg: true,
    })
    .toBuffer();

  const layout = createPassportSheetLayout(photoWidth, photoHeight, options.copies);

  const composites: OverlayOptions[] = [];

  for (let index = 0; index < layout.copyCount; index++) {
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);

    const left = layout.margin + col * (photoWidth + layout.gap);
    const top = layout.margin + row * (photoHeight + layout.gap);

    composites.push({
      input: photoBuffer,
      left,
      top,
    });
  }

  const sheetJpeg = await sharp({
    create: {
      width: layout.sheetWidth,
      height: layout.sheetHeight,
      channels: 3,
      background: {
        r: 255,
        g: 255,
        b: 255,
      },
    },
  })
    .composite(composites)
    .jpeg({
      quality,
      mozjpeg: true,
    })
    .toBuffer();

  if (options.outputFormat === "pdf") {
    const pdf = await PDFDocument.create();
    const embedded = await pdf.embedJpg(sheetJpeg);
    const page = pdf.addPage([layout.sheetWidth, layout.sheetHeight]);

    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: layout.sheetWidth,
      height: layout.sheetHeight,
    });

    const pdfBytes = Buffer.from(
      await pdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
        objectsPerTick: 100,
      })
    );

    return {
      buffer: pdfBytes,
      fileName: `${getBaseName(options.file.name)}-passport-sheet.pdf`,
      contentType: "application/pdf",
      copiesPlaced: layout.copyCount,
      sheetWidth: layout.sheetWidth,
      sheetHeight: layout.sheetHeight,
    };
  }

  return {
    buffer: sheetJpeg,
    fileName: `${getBaseName(options.file.name)}-passport-sheet.jpg`,
    contentType: "image/jpeg",
    copiesPlaced: layout.copyCount,
    sheetWidth: layout.sheetWidth,
    sheetHeight: layout.sheetHeight,
  };
}

export function getPassportTargets() {
  return PASSPORT_TARGETS;
}

import path from "path";

import { ValidationError } from "@/lib/pdf/errors";

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

export interface ImageUploadFile {
  name: string;
  type: string;
  size: number;
  buffer: Uint8Array;
}

const EXTENSION_FORMAT_MAP: Record<string, ImageFormat> = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".webp": "webp",
  ".avif": "avif",
};

export function validateImageFile(file: ImageUploadFile): void {
  if (!file.name.trim()) {
    throw new ValidationError("Invalid file name.");
  }

  if (file.size <= 0) {
    throw new ValidationError(`"${file.name}" is empty.`);
  }

  if (!file.buffer.length) {
    throw new ValidationError(`"${file.name}" has no data.`);
  }

  if (!isSupportedImage(file)) {
    throw new ValidationError(
      `"${file.name}" is not a supported image file.`
    );
  }
}

export function isSupportedImage(file: Pick<ImageUploadFile, "name" | "type">): boolean {
  const extension = path.extname(file.name).toLowerCase();

  return (
    SUPPORTED_IMAGE_MIME_TYPES.includes(
      file.type.toLowerCase() as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number]
    ) || Boolean(EXTENSION_FORMAT_MAP[extension])
  );
}

export function detectImageFormat(file: Pick<ImageUploadFile, "name" | "type">): ImageFormat {
  const type = file.type.toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    return "jpeg";
  }

  if (type === "image/png") {
    return "png";
  }

  if (type === "image/webp") {
    return "webp";
  }

  if (type === "image/avif") {
    return "avif";
  }

  const extension = path.extname(file.name).toLowerCase();

  return EXTENSION_FORMAT_MAP[extension] ?? "jpeg";
}

export function formatToExtension(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

export function formatToMime(format: ImageFormat): string {
  if (format === "avif") {
    return "image/avif";
  }

  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

export function getBaseName(fileName: string): string {
  const baseName = path.basename(fileName, path.extname(fileName)).trim();

  return baseName || "image";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toPositiveInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${label} must be greater than 0.`);
  }

  return Math.floor(value);
}

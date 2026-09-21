import path from "node:path";
import { createHash } from "node:crypto";

import {
  FileTooLargeError,
  InvalidFileError,
  UnsupportedFileTypeError,
} from "./errors.ts";
import { FILE_LIMITS, MAX_METADATA_ITEMS } from "./constants.ts";
import type { MetadataItem, SupportedFileType } from "./types.ts";

const BY_EXTENSION: Record<string, SupportedFileType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".xlsx": "xlsx",
  ".pptx": "pptx",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
  ".png": "png",
};

const MIME_BY_TYPE: Record<SupportedFileType, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
};

export function getSupportedMimeTypes() {
  return MIME_BY_TYPE;
}

export function isAllowedExtension(fileName: string): boolean {
  const ext = path.extname(fileName || "").toLowerCase();
  return Boolean(BY_EXTENSION[ext]);
}

export function detectFileType(fileName: string, mimeType?: string): SupportedFileType | null {
  const ext = path.extname(fileName || "").toLowerCase();
  if (BY_EXTENSION[ext]) {
    return BY_EXTENSION[ext];
  }

  if (!mimeType) {
    return null;
  }

  const normalizedMime = mimeType.toLowerCase();

  for (const [type, allowed] of Object.entries(MIME_BY_TYPE) as Array<[SupportedFileType, string[]]>) {
    if (allowed.includes(normalizedMime)) {
      return type;
    }
  }

  return null;
}

export function validateMimeType(mimeType: string, allowed: string[] = []): void {
  const normalized = mimeType?.trim().toLowerCase();
  if (!normalized) {
    throw new UnsupportedFileTypeError();
  }

  const values = allowed.length > 0 ? allowed : Object.values(MIME_BY_TYPE).flat();
  if (!values.includes(normalized)) {
    throw new UnsupportedFileTypeError();
  }
}

export function validateFileSize(type: SupportedFileType, size: number): void {
  const maxBytes = FILE_LIMITS[type] ?? FILE_LIMITS.png;
  if (size <= 0) {
    throw new InvalidFileError("The uploaded file is empty.");
  }

  if (size > maxBytes) {
    throw new FileTooLargeError();
  }
}

export function sanitizeFilename(originalName: string): string {
  const raw = String(originalName || "document");
  const normalized = raw.replace(/[\\/]+/g, "-").replace(/[\x00-\x1F\x7F]+/g, "");
  const withoutDots = normalized.replace(/^[\.\-]+/, "");
  const noPath = path.basename(withoutDots || "document");
  const cleaned = noPath.replace(/[<>:"|?*]+/g, " ").replace(/\s+/g, " ").trim();
  const ext = path.extname(cleaned || "document").toLowerCase();
  const nameWithoutExt = path.basename(cleaned || "document", ext) || "document";
  const safeBase = nameWithoutExt.replace(/^[\.\-]+/, "").slice(0, 180) || "document";

  return `${safeBase}-cleaned${ext || ".bin"}`;
}

export function normalizeMetadataValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return String(value).slice(0, 500);
}

export function truncateMetadataItems(items: MetadataItem[]): MetadataItem[] {
  if (items.length <= MAX_METADATA_ITEMS) {
    return items;
  }

  return items.slice(0, MAX_METADATA_ITEMS);
}

export function validateMagicBytes(buffer: Buffer, type: SupportedFileType): void {
  if (!buffer || buffer.length < 4) {
    throw new InvalidFileError();
  }

  const header = buffer.subarray(0, 8);

  if (type === "pdf") {
    if (header.toString("ascii", 0, 5) !== "%PDF-") {
      throw new InvalidFileError();
    }
    return;
  }

  if (type === "png") {
    if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return;
    }
    throw new InvalidFileError();
  }

  if (type === "jpg" || type === "jpeg") {
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return;
    }
    throw new InvalidFileError();
  }

  if (type === "docx" || type === "xlsx" || type === "pptx") {
    if (header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) || header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))) {
      return;
    }
    throw new InvalidFileError();
  }

  throw new InvalidFileError();
}

export function checksumBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

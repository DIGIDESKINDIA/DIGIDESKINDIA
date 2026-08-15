import { ValidationError } from "./errors";
import type { PdfFile } from "./types";

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_FILES = 30;
export const MIN_FILES = 1;
export const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB

const PDF_SIGNATURE = "%PDF";

export function validatePdf(file: PdfFile): void {
  if (!file) {
    throw new ValidationError("PDF file is required.");
  }

  if (!file.name.trim()) {
    throw new ValidationError("Invalid file name.");
  }

  if (file.size <= 0) {
    throw new ValidationError(
      `"${file.name}" is empty.`
    );
  }

  if (file.buffer !== undefined && !file.buffer.length) {
    throw new ValidationError(
      `"${file.name}" has no data.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `"${file.name}" exceeds the maximum file size of 100 MB.`
    );
  }

  if (file.buffer !== undefined) {
    const signature = Buffer.from(file.buffer)
      .subarray(0, 4)
      .toString("utf8");

    if (signature !== PDF_SIGNATURE) {
      throw new ValidationError(
        `"${file.name}" is not a valid PDF file.`
      );
    }
  }
}

export function validateMultiple(
  files: PdfFile[]
): void {
  if (!files.length) {
    throw new ValidationError(
      "No PDF files selected."
    );
  }

  if (files.length < MIN_FILES) {
    throw new ValidationError(
      `Please select at least ${MIN_FILES} PDF file.`
    );
  }

  if (files.length > MAX_FILES) {
    throw new ValidationError(
      `Maximum ${MAX_FILES} PDF files are allowed.`
    );
  }

  const uniqueFiles = new Set<string>();

  let totalSize = 0;

  for (const file of files) {
    validatePdf(file);

    totalSize += file.size;

    const key = `${file.name}-${file.size}`;

    if (uniqueFiles.has(key)) {
      throw new ValidationError(
        `Duplicate file detected: "${file.name}".`
      );
    }

    uniqueFiles.add(key);
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new ValidationError(
      "Total upload size exceeds 500 MB."
    );
  }
}

export function validatePageNumbers(
  pages: number[],
  totalPages: number
): void {
  if (!pages.length) {
    throw new ValidationError(
      "No page selected."
    );
  }

  const uniquePages = new Set<number>();

  for (const page of pages) {
    if (!Number.isInteger(page)) {
      throw new ValidationError(
        "Page number must be an integer."
      );
    }

    if (page < 1 || page > totalPages) {
      throw new ValidationError(
        `Page ${page} is out of range.`
      );
    }

    if (uniquePages.has(page)) {
      throw new ValidationError(
        `Duplicate page ${page}.`
      );
    }

    uniquePages.add(page);
  }
}

export function validatePassword(
  password: string
): void {
  if (!password.trim()) {
    throw new ValidationError(
      "Password is required."
    );
  }

  if (password.length < 4) {
    throw new ValidationError(
      "Password must contain at least 4 characters."
    );
  }

  if (password.length > 128) {
    throw new ValidationError(
      "Password is too long."
    );
  }
}
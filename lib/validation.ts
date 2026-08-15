import { PDFDocument } from "pdf-lib";

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_FILES = 20;

export async function validatePdfFile(file: File) {
  if (file.type !== "application/pdf") {
    throw new Error(`${file.name} is not a PDF file.`);
  }

  if (file.size === 0) {
    throw new Error(`${file.name} is empty.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `${file.name} exceeds the maximum file size of 100MB.`
    );
  }

  try {
    const bytes = await file.arrayBuffer();

    await PDFDocument.load(bytes, {
      ignoreEncryption: true,
    });
  } catch {
    throw new Error(
      `${file.name} is corrupted or encrypted.`
    );
  }
}

export async function validatePdfFiles(
  files: File[]
) {
  if (files.length < 2) {
    throw new Error(
      "Select at least two PDF files."
    );
  }

  if (files.length > MAX_FILES) {
    throw new Error(
      `Maximum ${MAX_FILES} PDF files allowed.`
    );
  }

  for (const file of files) {
    await validatePdfFile(file);
  }
}
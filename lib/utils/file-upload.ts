import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

/**
 * Safe upload directory path.
 * Uses the current working directory or temp directory to avoid path traversal attacks.
 */
const UPLOAD_DIR = process.env.SIGNING_STORAGE_DIR || "storage/uploads";

/**
 * Ensure the upload directory exists
 */
export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate a safe random filename
 */
export function generateSafeFileName(originalName: string): string {
  // Remove path components and dangerous characters
  const baseName = path.basename(originalName)
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 100) || "file";

  return `${crypto.randomUUID()}-${baseName}`;
}

/**
 * Generate the full path for an uploaded file
 * Prevents directory traversal by validating the path
 */
export function getUploadPath(safeFileName: string): string {
  const fullPath = path.resolve(path.join(UPLOAD_DIR, safeFileName));
  const uploadDirResolved = path.resolve(UPLOAD_DIR);
  const relativePath = path.relative(uploadDirResolved, fullPath);

  // Security: ensure the file path is within the upload directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error("Invalid file path");
  }

  return fullPath;
}

/**
 * Clean up a single uploaded file safely
 */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    // Validate the path is within upload directory
    const resolved = path.resolve(filePath);
    const uploadDirResolved = path.resolve(UPLOAD_DIR);
    if (!resolved.startsWith(uploadDirResolved)) {
      console.warn(`[File Cleanup] Attempted to delete file outside upload directory: ${filePath}`);
      return;
    }

    await fs.unlink(resolved).catch(() => {
      // Silently ignore if file doesn't exist
    });
  } catch (error) {
    console.error(`[File Cleanup] Error deleting file ${filePath}:`, error);
  }
}

/**
 * Clean up multiple files in parallel
 */
export async function deleteUploadedFiles(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(filePath => deleteUploadedFile(filePath))
  );
}

/**
 * Create a temporary directory for processing
 */
export async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "digital-desk-"));
}

/**
 * Clean up a temporary directory and all its contents
 */
export async function deleteTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`[File Cleanup] Error deleting temp directory ${dirPath}:`, error);
  }
}

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number, maxSize: number): void {
  if (fileSize <= 0) {
    throw new Error("File is empty");
  }

  if (fileSize > maxSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${formatBytes(maxSize)}`
    );
  }
}

/**
 * Validate MIME type against allowed types
 */
export function validateMimeType(fileMime: string, allowedMimes: string[]): void {
  if (!allowedMimes.includes(fileMime)) {
    throw new Error(
      `File type "${fileMime}" is not supported. Allowed types: ${allowedMimes.join(", ")}`
    );
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

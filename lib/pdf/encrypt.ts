// File: lib/pdf/encrypt.ts

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { execa } from "execa";

import {
  EncryptOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";
import { resolveQpdfBinary } from "./qpdf";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Password Protection
 *
 * Requires:
 * qpdf
 *
 * https://qpdf.sourceforge.io/
 * ==========================================================
 */

export async function encryptPDF(
  options: EncryptOptions
): Promise<PDFOperationResult> {
  try {
    const password = options.password ?? "";

    if (!password.trim()) {
      throw new Error("Password is required.");
    }

    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    const outputName =
      `protected-${crypto.randomUUID()}.pdf`;

    const outputPath = path.join(
      TEMP_OUTPUT_DIR,
      outputName
    );

    /**
     * qpdf
     *
     * --encrypt
     * user-password
     * owner-password
     * key-length
     */

    const inputPath = options.file.path;

    if (!inputPath) {
      throw new Error("Input file path is missing.");
    }

    await execa(
      await resolveQpdfBinary(),
      [
        "--encrypt",
        password,
        password,
        "256",
        "--",
        inputPath,
        outputPath,
      ],
      {
        shell: false,
      }
    );

    const stats =
      await fs.stat(outputPath);

    return {
      success: true,

      operation: "encrypt",

      outputName,

      outputPath,

      message:
        "Password protection added successfully.",

      metadata: {
        algorithm: "AES-256",

        size: stats.size,
      },
    };
  } catch (error) {
    return {
      success: false,

      operation: "encrypt",

      message:
        error instanceof Error
          ? error.message
          : "Encryption failed.",
    };
  }
}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateEncrypt(
  options: EncryptOptions
): boolean {
  const password = options.password ?? "";

  return (
    options.file !== undefined &&
    password.trim().length >= 4
  );
}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function encryptMetadata(
  options: EncryptOptions
) {
  const inputPath = options.file.path;

  if (!inputPath) {
    throw new Error("Input file path is missing.");
  }

  const stats = await fs.stat(inputPath);

  return {
    originalName:
      options.file.name,

    size:
      stats.size,

    algorithm:
      "AES-256",

    passwordLength:
      (options.password ?? "").length,
  };
}
// File: lib/pdf/convert/libreoffice.ts

import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execa } from "execa";

import { ConvertOptions, ConvertResult } from "../types";
import { findLibreOfficeExecutable } from "./find-libreoffice";

const OUTPUT_DIR = "storage/output";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").trim() || "document";
}

export async function convertOfficeToPDF(options: ConvertOptions): Promise<ConvertResult> {
  try {
    const sofficeExecutable = await findLibreOfficeExecutable();
    if (!sofficeExecutable) {
      console.error("[LIBREOFFICE_CONVERT] LibreOffice not found on system.");
      return {
        success: false,
        message: "LibreOffice is not configured on the server.",
      };
    }

    const workingRoot = path.resolve(OUTPUT_DIR, crypto.randomUUID());
    const inputDir = path.join(workingRoot, "input");
    const outputDir = path.join(workingRoot, "output");
    const userProfile = path.join(workingRoot, "profile");

    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(userProfile, { recursive: true });

    const safeInputName = safeName(path.basename(options.input.name) || "document");
    const inputPath = path.join(inputDir, safeInputName);

    await fs.copyFile(options.input.path, inputPath);

    console.log("[LIBREOFFICE_CONVERT] Using soffice executable:", sofficeExecutable);
    console.log("[LIBREOFFICE_CONVERT] Starting conversion:", inputPath, "->", outputDir);

    const environment = {
      ...process.env,
      HOME: userProfile,
      USERPROFILE: userProfile,
      TMPDIR: userProfile,
      TMP: userProfile,
      TEMP: userProfile,
    };

    await execa(
      sofficeExecutable,
      [
        "--headless",
        "--nologo",
        "--nodefault",
        "--norestore",
        "--nolockcheck",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ],
      {
        env: environment,
        timeout: 120000,
        reject: true,
      }
    );

    const files = await fs.readdir(outputDir);
    const pdfFile = files.find((file) => file.toLowerCase().endsWith(".pdf"));

    if (!pdfFile) {
      throw new Error("LibreOffice conversion did not produce a PDF file.");
    }

    const pdfPath = path.join(outputDir, pdfFile);
    const pdfBuffer = await fs.readFile(pdfPath);

    if (pdfBuffer.length === 0) {
      throw new Error("The generated PDF is empty.");
    }

    const header = pdfBuffer.subarray(0, 5).toString("ascii");
    if (header !== "%PDF-") {
      throw new Error("The generated file is not a valid PDF.");
    }

    console.log("[LIBREOFFICE_CONVERT] Conversion successful, output file:", pdfPath);

    return {
      success: true,
      outputName: pdfFile,
      outputPath: pdfPath,
      message: "Converted successfully using LibreOffice.",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[LIBREOFFICE_CONVERT] Conversion failed:", errorMessage);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "The uploaded Excel file could not be converted.",
    };
  }
}

export function validateOfficeFile(fileName: string) {
  return /\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(fileName);
}

export async function libreOfficeInstalled() {
  const sofficeExecutable = await findLibreOfficeExecutable();
  if (!sofficeExecutable) return false;

  try {
    await execa(sofficeExecutable, ["--version"], { timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

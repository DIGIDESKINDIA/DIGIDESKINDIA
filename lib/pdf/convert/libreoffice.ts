// File: lib/pdf/convert/libreoffice.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { execa } from "execa";

import { ConvertOptions, ConvertResult } from "../types";

const OUTPUT_DIR = "storage/output";

/**
 * ==========================================================
 * Digital Desk India
 * LibreOffice Conversion Engine
 *
 * Supports
 * ----------
 * DOCX -> PDF
 * XLSX -> PDF
 * PPTX -> PDF
 * ODT  -> PDF
 * ODS  -> PDF
 * ODP  -> PDF
 *
 * Requires:
 * LibreOffice
 *
 * Windows:
 * soffice.exe
 *
 * Linux:
 * libreoffice
 * ==========================================================
 */

export async function convertOfficeToPDF(
    options: ConvertOptions
): Promise<ConvertResult> {

    try {

        await fs.mkdir(
            OUTPUT_DIR,
            {
                recursive: true,
            }
        );

        const tempFolder =
            path.join(
                OUTPUT_DIR,
                crypto.randomUUID()
            );

        await fs.mkdir(tempFolder);

        /**
         * Convert
         */

        await execa(
            "soffice",
            [
                "--headless",

                "--convert-to",

                "pdf",

                options.input.path,

                "--outdir",

                tempFolder,
            ]
        );

        const files =
            await fs.readdir(
                tempFolder
            );

        const pdf =
            files.find((file) =>
                file.endsWith(".pdf")
            );

        if (!pdf) {

            throw new Error(
                "LibreOffice conversion failed."
            );

        }

        return {

            success: true,

            outputName: pdf,

            outputPath:
                path.join(
                    tempFolder,
                    pdf
                ),

            message:
                "Converted successfully.",

        };

    } catch (error) {

        return {

            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Conversion failed.",

        };

    }

}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateOfficeFile(
    fileName: string
) {

    return /\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(
        fileName
    );

}

/**
 * ==========================================================
 * LibreOffice Exists
 * ==========================================================
 */

export async function libreOfficeInstalled() {

    try {

        await execa(
            "soffice",
            [
                "--version",
            ]
        );

        return true;

    } catch {

        return false;

    }

}
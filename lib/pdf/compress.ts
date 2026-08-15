// File: lib/pdf/compress.ts

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { execa } from "execa";

import {
    CompressOptions,
    PDFOperationResult,
} from "./types";

import {
    TEMP_OUTPUT_DIR,
} from "./constants";

const QUALITY = {

    low: "/screen",

    medium: "/ebook",

    high: "/printer",

} as const;

export async function compressPDF(
    options: CompressOptions
): Promise<PDFOperationResult> {

    try {

        await fs.mkdir(
            TEMP_OUTPUT_DIR,
            {
                recursive: true,
            }
        );

        const outputName =
            `compressed-${crypto.randomUUID()}.pdf`;

        const outputPath =
            path.join(
                TEMP_OUTPUT_DIR,
                outputName
            );

        const executable = "gswin64c";
        const inputPath = options.file.path;
        const qualityValue = options.quality ?? "medium";
        const quality = QUALITY[qualityValue as keyof typeof QUALITY] ?? "/ebook";

        if (!inputPath) {
            throw new Error("Input file path is missing.");
        }

        await execa(
            executable,
            [
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                `-dPDFSETTINGS=${quality}`,
                `-sOutputFile=${outputPath}`,
                inputPath,
            ],
            {
                shell: false,
            }
        );

        return {

            success: true,

            operation: "compress",

            outputPath,

            outputName,

            message:
                "PDF compressed successfully.",

        };

    } catch (error) {

        return {

            success: false,

            operation: "compress",

            message:
                error instanceof Error
                    ? error.message
                    : "Compression failed.",

        };

    }

}
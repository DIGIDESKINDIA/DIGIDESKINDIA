// File: lib/pdf/convert/image.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import sharp from "sharp";

import {
    PDFDocument,
} from "pdf-lib";

import {
    ConvertOptions,
    ConvertResult,
} from "../types";

const OUTPUT_DIR =
    "storage/output";

/**
 * ==========================================================
 * Digital Desk India
 * Image Conversion Engine
 *
 * Supported
 *
 * JPG
 * JPEG
 * PNG
 * WEBP
 *
 * ==========================================================
 */

const IMAGE_TYPES = [

    ".jpg",

    ".jpeg",

    ".png",

    ".webp",

];

/* ==========================================================
   Image -> PDF
========================================================== */

export async function imageToPDF(
    options: ConvertOptions
): Promise<ConvertResult> {

    try {

        await fs.mkdir(
            OUTPUT_DIR,
            {
                recursive: true,
            }
        );

        const image =
            sharp(
                options.input.path
            );

        const metadata =
            await image.metadata();

        const png =
            await image
                .png()
                .toBuffer();

        const pdf =
            await PDFDocument.create();

        const embedded =
            await pdf.embedPng(
                png
            );

        const page =
            pdf.addPage([
                metadata.width ?? 595,
                metadata.height ?? 842,
            ]);

        page.drawImage(
            embedded,
            {
                x: 0,

                y: 0,

                width:
                    metadata.width ??
                    595,

                height:
                    metadata.height ??
                    842,
            }
        );

        const bytes =
            await pdf.save();

        const outputName =
            `image-${crypto.randomUUID()}.pdf`;

        const outputPath =
            path.join(
                OUTPUT_DIR,
                outputName
            );

        await fs.writeFile(
            outputPath,
            bytes
        );

        return {

            success: true,

            outputName,

            outputPath,

            message:
                "Image converted to PDF.",

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

/* ==========================================================
   Resize Image
========================================================== */

export async function resizeImage(
    input: string,
    width: number,
    height: number,
    output: string
) {

    await sharp(input)

        .resize(
            width,
            height
        )

        .toFile(
            output
        );

}

/* ==========================================================
   Compress Image
========================================================== */

export async function compressImage(
    input: string,
    output: string,
    quality = 80
) {

    await sharp(input)

        .jpeg({

            quality,

        })

        .toFile(
            output
        );

}

/* ==========================================================
   PNG
========================================================== */

export async function convertPNG(
    input: string,
    output: string
) {

    await sharp(input)

        .png()

        .toFile(
            output
        );

}

/* ==========================================================
   WEBP
========================================================== */

export async function convertWEBP(
    input: string,
    output: string
) {

    await sharp(input)

        .webp()

        .toFile(
            output
        );

}

/* ==========================================================
   JPG
========================================================== */

export async function convertJPG(
    input: string,
    output: string
) {

    await sharp(input)

        .jpeg()

        .toFile(
            output
        );

}

/* ==========================================================
   Validation
========================================================== */

export function validateImage(
    fileName: string
) {

    return IMAGE_TYPES.includes(
        path
            .extname(fileName)
            .toLowerCase()
    );

}

/* ==========================================================
   Metadata
========================================================== */

export async function imageMetadata(
    file: string
) {

    return sharp(file)

        .metadata();

}
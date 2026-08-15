// File: lib/pdf/convert/office.ts

import path from "path";
import fs from "fs/promises";

import {
    ConvertOptions,
    ConvertResult,
} from "../types";

import {
    convertOfficeToPDF,
    validateOfficeFile,
} from "./libreoffice";

/**
 * ==========================================================
 * Digital Desk India
 * Office Conversion Engine
 * ==========================================================
 *
 * Supported
 *
 * DOC
 * DOCX
 * XLS
 * XLSX
 * PPT
 * PPTX
 * ODT
 * ODS
 * ODP
 *
 * ==========================================================
 */

export async function officeConverter(
    options: ConvertOptions
): Promise<ConvertResult> {

    const extension =
        path
            .extname(options.input.name)
            .toLowerCase();

    switch (extension) {

        case ".doc":
        case ".docx":

        case ".xls":
        case ".xlsx":

        case ".ppt":
        case ".pptx":

        case ".odt":
        case ".ods":
        case ".odp":

            return convertOfficeToPDF(
                options
            );

        default:

            return {

                success: false,

                message:
                    "Unsupported Office document.",

            };

    }

}

/**
 * ==========================================================
 * File Validation
 * ==========================================================
 */

export async function validateOfficeConversion(
    options: ConvertOptions
) {

    if (
        !validateOfficeFile(
            options.input.name
        )
    ) {

        throw new Error(
            "Invalid Office document."
        );

    }

    await fs.access(
        options.input.path
    );

    return true;

}

/**
 * ==========================================================
 * Supported Formats
 * ==========================================================
 */

export function officeFormats() {

    return [

        ".doc",

        ".docx",

        ".xls",

        ".xlsx",

        ".ppt",

        ".pptx",

        ".odt",

        ".ods",

        ".odp",

    ];

}

/**
 * ==========================================================
 * Human Readable Formats
 * ==========================================================
 */

export function officeFormatLabels() {

    return {

        ".doc": "Microsoft Word",

        ".docx": "Microsoft Word",

        ".xls": "Microsoft Excel",

        ".xlsx": "Microsoft Excel",

        ".ppt": "Microsoft PowerPoint",

        ".pptx": "Microsoft PowerPoint",

        ".odt": "OpenDocument Text",

        ".ods": "OpenDocument Spreadsheet",

        ".odp": "OpenDocument Presentation",

    };

}

/**
 * ==========================================================
 * Detect Office Type
 * ==========================================================
 */

export function detectOfficeType(
    fileName: string
) {

    const ext =
        path
            .extname(fileName)
            .toLowerCase();

    const formats =
        officeFormatLabels();

    return (
        formats[
            ext as keyof typeof formats
        ] ??
        "Unknown"
    );

}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function officeMetadata(
    options: ConvertOptions
) {

    const stat =
        await fs.stat(
            options.input.path
        );

    return {

        fileName:
            options.input.name,

        size:
            stat.size,

        type:
            detectOfficeType(
                options.input.name
            ),

        output:
            "PDF",

    };

}

/**
 * ==========================================================
 * Can Convert
 * ==========================================================
 */

export function canConvertOffice(
    fileName: string
) {

    return validateOfficeFile(
        fileName
    );

}
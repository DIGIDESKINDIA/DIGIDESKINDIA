// File: lib/pdf/convert/poppler.ts

import { execa } from "execa";
import fs from "fs/promises";
import path from "path";

export interface PDFInfo {

    title?: string;

    author?: string;

    creator?: string;

    producer?: string;

    pages: number;

    encrypted: boolean;

    pageSize?: string;

    pdfVersion?: string;

}

export async function pdfInfo(
    pdfPath: string
): Promise<PDFInfo> {

    const { stdout } =
        await execa(
            "pdfinfo",
            [pdfPath]
        );

    const lines =
        stdout.split("\n");

    const map: Record<
        string,
        string
    > = {};

    for (const line of lines) {

        const index =
            line.indexOf(":");

        if (index === -1)
            continue;

        const key =
            line
                .slice(0, index)
                .trim();

        const value =
            line
                .slice(index + 1)
                .trim();

        map[key] = value;

    }

    return {

        title:
            map.Title,

        author:
            map.Author,

        creator:
            map.Creator,

        producer:
            map.Producer,

        pages:
            Number(
                map.Pages ??
                0
            ),

        encrypted:
            map.Encrypted === "yes",

        pageSize:
            map["Page size"],

        pdfVersion:
            map["PDF version"],

    };

}

export async function renderPagePNG(
    pdf: string,
    outputPrefix: string,
    page = 1,
    dpi = 180
) {

    await execa(
        "pdftoppm",
        [

            "-png",

            "-f",
            String(page),

            "-l",
            String(page),

            "-r",
            String(dpi),

            pdf,

            outputPrefix,

        ]
    );

    return `${outputPrefix}-${page}.png`;

}

export async function renderAllPagesPNG(
    pdf: string,
    outputPrefix: string,
    dpi = 180
) {

    await execa(
        "pdftoppm",
        [

            "-png",

            "-r",
            String(dpi),

            pdf,

            outputPrefix,

        ]
    );

}

export async function pdfToJPEG(
    pdf: string,
    outputPrefix: string,
    dpi = 180
) {

    await execa(
        "pdftoppm",
        [

            "-jpeg",

            "-r",
            String(dpi),

            pdf,

            outputPrefix,

        ]
    );

}

export async function pdfToSVG(
    pdf: string,
    output: string
) {

    await execa(
        "pdftocairo",
        [

            "-svg",

            pdf,

            output,

        ]
    );

}

export async function pdfToPNG(
    pdf: string,
    output: string,
    dpi = 180
) {

    await execa(
        "pdftocairo",
        [

            "-png",

            "-r",

            String(dpi),

            pdf,

            output,

        ]
    );

}

export async function pageCount(
    pdf: string
) {

    const info =
        await pdfInfo(pdf);

    return info.pages;

}

export async function isEncrypted(
    pdf: string
) {

    const info =
        await pdfInfo(pdf);

    return info.encrypted;

}

export async function fileExists(
    file: string
) {

    try {

        await fs.access(file);

        return true;

    } catch {

        return false;

    }

}

export function outputName(
    file: string
) {

    return path.parse(file).name;

}
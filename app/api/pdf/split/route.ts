import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import { splitPDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

export async function POST(
    request: NextRequest
) {
    let uploadPath: string | null = null;
    let generatedFiles: string[] = [];

    try {
        const form = await request.formData();

        const file =
            form.get("file") as File | null;

        const rangesInput = String(
            form.get("ranges") ?? ""
        ).trim();

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    message: "PDF file is required.",
                },
                {
                    status: 400,
                }
            );
        }

        const isPdf =
            file.type ===
                "application/pdf" ||
            file.name
                .toLowerCase()
                .endsWith(".pdf");

        if (!isPdf) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Please upload a valid PDF file.",
                },
                {
                    status: 400,
                }
            );
        }

        if (file.size <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Selected PDF is empty.",
                },
                {
                    status: 400,
                }
            );
        }

        await fs.mkdir(UPLOAD_DIR, {
            recursive: true,
        });

        const bytes = Buffer.from(
            await file.arrayBuffer()
        );

        const uploadName = `${crypto.randomUUID()}-${file.name}`;

        uploadPath = path.join(
            UPLOAD_DIR,
            uploadName
        );

        await fs.writeFile(
            uploadPath,
            bytes
        );

        let ranges = rangesInput;

        if (!ranges) {
            const pdf =
                await PDFDocument.load(bytes, {
                    ignoreEncryption: true,
                });

            const totalPages =
                pdf.getPageCount();

            if (totalPages <= 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Unable to read PDF pages.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            ranges = `1-${totalPages}`;
        }

        const result = await splitPDF({
            file: {
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                type: file.type,
                path: uploadPath,
            },
            ranges,
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        result.message ||
                        "Split failed.",
                },
                {
                    status: 400,
                }
            );
        }

        generatedFiles =
            (result.metadata
                ?.generatedFiles as
                string[]) ?? [];

        if (!generatedFiles.length) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "No split files were generated.",
                },
                {
                    status: 500,
                }
            );
        }

        const zip = new JSZip();

        for (const filePath of generatedFiles) {
            const content =
                await fs.readFile(filePath);

            zip.file(
                path.basename(filePath),
                content
            );
        }

        const archive =
            await zip.generateAsync({
                type: "uint8array",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9,
                },
            });

        const fileName = `${file.name.replace(
            /\.pdf$/i,
            ""
        )}-split.zip`;

        return new NextResponse(
            Buffer.from(archive),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/zip",
                    "Content-Disposition": `attachment; filename="${fileName}"`,
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Split failed.",
            },
            {
                status: 500,
            }
        );
    } finally {
        if (uploadPath) {
            await fs
                .unlink(uploadPath)
                .catch(() => {});
    }

        await Promise.all(
            generatedFiles.map(
                async (filePath) => {
                    await fs
                        .unlink(filePath)
                        .catch(() => {});
                }
            )
        );
    }
}
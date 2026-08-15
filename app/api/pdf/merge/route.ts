// File: app/api/pdf/merge/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import { mergePDF } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest
) {

    try {

        const form =
            await request.formData();

        const uploads =
            form.getAll("files") as File[];

        if (
            uploads.length < 2
        ) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "Minimum two PDFs required.",

                },

                {

                    status: 400,

                }

            );

        }

        const uploadDir =
            "storage/uploads";

        await fs.mkdir(
            uploadDir,
            {
                recursive: true,
            }
        );

        const files = [];

        for (const upload of uploads) {

            const bytes =
                Buffer.from(
                    await upload.arrayBuffer()
                );

            const fileName =
                `${crypto.randomUUID()}-${upload.name}`;

            const filePath =
                path.join(
                    uploadDir,
                    fileName
                );

            await fs.writeFile(
                filePath,
                bytes
            );

            files.push({

                id:
                    crypto.randomUUID(),

                name:
                    upload.name,

                size:
                    upload.size,

                type:
                    upload.type,

                path:
                    filePath,

            });

        }

        const result =
            await mergePDF({

                files,

            });

        return NextResponse.json(
            result
        );

    } catch (error) {

        return NextResponse.json(

            {

                success: false,

                message:

                    error instanceof Error
                        ? error.message
                        : "Merge failed.",

            },

            {

                status: 500,

            }

        );

    }

}
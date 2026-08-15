// File: app/api/pdf/thumbnail/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import {
    generateThumbnail,
    generateAllThumbnails,
} from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const VALID_FORMATS = [
    "png",
    "jpg",
] as const;

type OutputFormat =
    (typeof VALID_FORMATS)[number];

export async function POST(
    request: NextRequest
) {

    try {

        const form =
            await request.formData();

        const file =
            form.get("file") as File | null;

        const dpi =
            Number(
                form.get("dpi") ?? 180
            );

        const format =
            String(
                form.get("format") ?? "png"
            ) as OutputFormat;

        const allPages =
            String(
                form.get("allPages") ?? "false"
            ) === "true";

        if (!file) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "PDF file is required.",

                },

                {

                    status: 400,

                }

            );

        }

        if (
            !VALID_FORMATS.includes(
                format
            )
        ) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "Unsupported image format.",

                },

                {

                    status: 400,

                }

            );

        }

        await fs.mkdir(
            UPLOAD_DIR,
            {
                recursive: true,
            }
        );

        const uploadName =
            `${crypto.randomUUID()}-${file.name}`;

        const uploadPath =
            path.join(
                UPLOAD_DIR,
                uploadName
            );

        await fs.writeFile(
            uploadPath,
            Buffer.from(
                await file.arrayBuffer()
            )
        );

        const pdf = {

            id:
                crypto.randomUUID(),

            name:
                file.name,

            size:
                file.size,

            type:
                file.type,

            path:
                uploadPath,

        };

        const result =
            allPages

                ? await generateAllThumbnails({

                      file: pdf,

                      dpi,

                      format,

                  })

                : await generateThumbnail({

                      file: pdf,

                      dpi,

                      format,

                  });

        return NextResponse.json(
            result
        );

    } catch (error) {

        console.error(error);

        return NextResponse.json(

            {

                success: false,

                message:

                    error instanceof Error

                        ? error.message

                        : "Thumbnail generation failed.",

            },

            {

                status: 500,

            }

        );

    }

}
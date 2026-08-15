// File: app/api/pdf/convert/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import {
    officeConverter,
    imageToPDF,
    convertHTMLToPDF,
    convertPDFToImage,
} from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const SUPPORTED = [

    "office-to-pdf",

    "image-to-pdf",

    "html-to-pdf",

    "pdf-to-image",

] as const;

type ConversionType =
    (typeof SUPPORTED)[number];

export async function POST(
    request: NextRequest
) {

    try {

        const form =
            await request.formData();

        const file =
            form.get("file") as File | null;

        const type =
            String(
                form.get("type")
            ) as ConversionType;

        if (!file) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "Input file required.",

                },

                {

                    status: 400,

                }

            );

        }

        if (
            !SUPPORTED.includes(
                type
            )
        ) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "Unsupported conversion.",

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

        const input = {

            path:
                uploadPath,

            name:
                file.name,

            size:
                file.size,

        };

        switch (type) {

            case "office-to-pdf":

                return NextResponse.json(

                    await officeConverter({

                        input,

                        outputFormat:
                            "pdf",

                    })

                );

            case "image-to-pdf":

                return NextResponse.json(

                    await imageToPDF({

                        input,

                        outputFormat:
                            "pdf",

                    })

                );

            case "html-to-pdf":

                return NextResponse.json(

                    await convertHTMLToPDF({

                        input,

                        outputFormat:
                            "pdf",

                    })

                );

            case "pdf-to-image":

                return NextResponse.json(

                    await convertPDFToImage({

                        input,

                        outputFormat:
                            "png",

                    })

                );

        }

    } catch (error) {

        console.error(error);

        return NextResponse.json(

            {

                success: false,

                message:

                    error instanceof Error

                        ? error.message

                        : "Conversion failed.",

            },

            {

                status: 500,

            }

        );

    }

}
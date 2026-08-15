// File: app/api/pdf/rotate/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import { rotatePDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const VALID_ANGLES = [90, 180, 270] as const;

type RotateAngle = (typeof VALID_ANGLES)[number];

export async function POST(
    request: NextRequest
) {

    try {

        const form =
            await request.formData();

        const file =
            form.get("file") as File | null;

        const angle =
            Number(
                form.get("angle") ?? 90
            ) as RotateAngle;

        const pagesText =
            String(
                form.get("pages") ?? ""
            );

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
            !VALID_ANGLES.includes(
                angle
            )
        ) {

            return NextResponse.json(

                {

                    success: false,

                    message:
                        "Invalid rotation angle.",

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

        const bytes =
            Buffer.from(
                await file.arrayBuffer()
            );

        await fs.writeFile(
            uploadPath,
            bytes
        );

        const pages =
            pagesText
                .split(",")

                .map((page) =>
                    Number(page.trim())
                )

                .filter(
                    (page) =>
                        !Number.isNaN(page)
                );

        const result =
            await rotatePDF({

                file: {

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

                },

                angle,

                pages,

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

                        : "Rotation failed.",

            },

            {

                status: 500,

            }

        );

    }

}
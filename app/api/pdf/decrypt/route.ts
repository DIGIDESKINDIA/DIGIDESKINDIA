// File: app/api/pdf/decrypt/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { decryptPDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

export async function POST(
    request: NextRequest
) {
    try {

        const form =
            await request.formData();

        const file =
            form.get("file") as File | null;

        const password =
            String(
                form.get("password") ?? ""
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

        if (!password.trim()) {

            return NextResponse.json(

                {
                    success: false,
                    message:
                        "Password is required.",
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

        const result =
            await decryptPDF({

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

                password,

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

                        : "Unable to unlock PDF.",

            },

            {

                status: 500,

            }

        );

    }

}
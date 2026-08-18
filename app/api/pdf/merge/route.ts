import { NextRequest, NextResponse } from "next/server";
import { mergePDF } from "@/lib/pdf";
import { createTempDir, deleteTempDir, generateSafeFileName } from "@/lib/utils/file-upload";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";


export async function POST(request: NextRequest) {
    let tempDir = "";
    try {
        const form = await request.formData();
        const uploads = form.getAll("files") as File[];

        if (uploads.length < 2) {
            return NextResponse.json(
                { success: false, message: "Minimum two PDFs required." },
                { status: 400 }
            );
        }

        tempDir = await createTempDir();
        const files = [];

        for (const upload of uploads) {
            const bytes = Buffer.from(await upload.arrayBuffer());
            const fileName = generateSafeFileName(upload.name);
            const filePath = path.join(tempDir, fileName);

            await fs.writeFile(filePath, bytes);

            files.push({
                id: crypto.randomUUID(),
                name: upload.name,
                size: upload.size,
                type: upload.type,
                path: filePath,
            });
        }

        const result = await mergePDF({ files });

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Merge failed.",
            },
            { status: 500 }
        );
    } finally {
        if (tempDir) {
            await deleteTempDir(tempDir);
        }
    }
}

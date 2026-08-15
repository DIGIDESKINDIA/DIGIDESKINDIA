// File: app/api/pdf/ocr/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

async function performOCR(_options?: unknown) {
  return {
    success: false,
    message: "OCR is not available in this build.",
  };
}

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const LANGUAGES = [
  "eng",
  "hin",
  "eng+hin",
] as const;

type OCRLanguage =
  (typeof LANGUAGES)[number];

export async function POST(
  request: NextRequest
) {
  try {
    const form =
      await request.formData();

    const file =
      form.get("file") as File | null;

    const language = String(
      form.get("language") ?? "eng"
    ) as OCRLanguage;

    const searchable =
      String(
        form.get("searchable") ?? "true"
      ) === "true";

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "File is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !LANGUAGES.includes(language)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unsupported OCR language.",
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
      await performOCR({
        path: uploadPath,
        language,
        searchable,
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
            : "OCR failed.",
      },
      {
        status: 500,
      }
    );
  }
}
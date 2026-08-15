// File: app/api/pdf/extract/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import { extractPDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

export async function POST(
  request: NextRequest
) {
  try {
    const form = await request.formData();

    const file =
      form.get("file") as File | null;

    const pagesText = String(
      form.get("pages") ?? ""
    );

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

    if (!pagesText.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Page numbers are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only PDF files are allowed.",
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

    const uploadPath = path.join(
      UPLOAD_DIR,
      uploadName
    );

    const bytes = Buffer.from(
      await file.arrayBuffer()
    );

    await fs.writeFile(
      uploadPath,
      bytes
    );

    const pages = pagesText
      .split(",")
      .map((page) =>
        Number(page.trim())
      )
      .filter(
        (page) =>
          !Number.isNaN(page) &&
          page > 0
      );

    if (!pages.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid page selection.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await extractPDF({
        file: {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          path: uploadPath,
        },
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
            : "Extraction failed.",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

import {
  PdfFile,
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import { deletePages } from "@/lib/pdf/delete-pages";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const upload = formData.get(
      "file"
    ) as File | null;

    const pagesText = formData.get(
      "pages"
    ) as string | null;

    if (!upload) {
      throw new ValidationError(
        "No PDF selected."
      );
    }

    if (
      upload.type !==
      "application/pdf"
    ) {
      throw new ValidationError(
        "Please upload a valid PDF."
      );
    }

    if (upload.size === 0) {
      throw new ValidationError(
        "Selected PDF is empty."
      );
    }

    if (!pagesText) {
      throw new ValidationError(
        "No pages selected."
      );
    }

    const pages = pagesText
      .split(",")
      .map((page) =>
        Number(page.trim())
      )
      .filter(
        (page) =>
          !Number.isNaN(page)
      );

    const pdf: PdfFile = {
      name: upload.name,
      size: upload.size,
      buffer:
        new Uint8Array(
          await upload.arrayBuffer()
        ),
    };

    const output =
      await deletePages({
        file: pdf,
        pages,
      });

    const now = new Date();

    const fileName = `Deleted-Pages-${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}.pdf`;

    return new NextResponse(
      Buffer.from(output),
      {
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition": `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[DELETE_PAGES]",
      error
    );

    if (
      error instanceof
        ValidationError ||
      error instanceof
        PdfEngineError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status:
            error.statusCode,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete PDF pages.",
      },
      {
        status: 500,
      }
    );
  }
}
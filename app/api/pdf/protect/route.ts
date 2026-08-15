import { NextRequest, NextResponse } from "next/server";

import {
  PdfFile,
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import { protectPdf } from "@/lib/pdf/protect";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const upload = formData.get(
      "file"
    ) as File | null;

    const password = String(
      formData.get("password") ?? ""
    ).trim();

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

    if (
      upload.size >
      MAX_FILE_SIZE
    ) {
      throw new ValidationError(
        "Maximum supported PDF size is 100 MB."
      );
    }

    const pdf: PdfFile = {
      name: upload.name,
      size: upload.size,
      buffer: new Uint8Array(
        await upload.arrayBuffer()
      ),
    };

    const output =
      await protectPdf({
        file: pdf,
        password,
      });

    const now = new Date();

    const fileName = `Protected-${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}.pdf`;

    return new NextResponse(
      Buffer.from(output),
      {
        status: 200,
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
      "[PROTECT_PDF]",
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
          "Unable to protect PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
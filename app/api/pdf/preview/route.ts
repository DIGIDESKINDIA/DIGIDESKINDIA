import { NextRequest, NextResponse } from "next/server";

import {
  PdfFile,
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import {
  getPdfPreview,
} from "@/lib/pdf/preview";

export const runtime = "nodejs";

const MAX_FILE_SIZE =
  100 * 1024 * 1024;

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const upload = formData.get(
      "file"
    ) as File | null;

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

    const preview =
      await getPdfPreview(
        pdf
      );

    return NextResponse.json(
      {
        success: true,
        ...preview,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[PDF_PREVIEW]",
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
          "Unable to generate PDF preview.",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

import {
  PdfFile,
  PdfMetadata,
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import { updatePdfMetadata } from "@/lib/pdf/metadata";

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

    const metadata: PdfMetadata = {
      title: String(
        formData.get("title") ?? ""
      ).trim(),

      author: String(
        formData.get("author") ?? ""
      ).trim(),

      subject: String(
        formData.get("subject") ?? ""
      ).trim(),

      creator: String(
        formData.get("creator") ?? ""
      ).trim(),

      producer: String(
        formData.get("producer") ??
          "DigiDesk India"
      ).trim(),

      keywords: String(
        formData.get("keywords") ??
          ""
      )
        .split(",")
        .map((keyword) =>
          keyword.trim()
        )
        .filter(Boolean),
    };

    const pdf: PdfFile = {
      name: upload.name,
      size: upload.size,
      buffer: new Uint8Array(
        await upload.arrayBuffer()
      ),
    };

    const output =
      await updatePdfMetadata(
        pdf,
        metadata
      );

    const fileName = `${upload.name.replace(
      /\.pdf$/i,
      ""
    )}-metadata.pdf`;

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
      "[PDF_METADATA]",
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
          "Unable to update PDF metadata.",
      },
      {
        status: 500,
      }
    );
  }
}
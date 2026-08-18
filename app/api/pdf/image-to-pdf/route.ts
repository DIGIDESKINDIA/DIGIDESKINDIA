import { NextRequest, NextResponse } from "next/server";

import {
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import { imageToPdf } from "@/lib/pdf/image-to-pdf";

export const runtime = "nodejs";

const MAX_FILES = 30;

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const uploads =
      formData.getAll(
        "images"
      ) as File[];

    if (!uploads.length) {
      throw new ValidationError(
        "No images selected."
      );
    }

    if (
      uploads.length >
      MAX_FILES
    ) {
      throw new ValidationError(
        `Maximum ${MAX_FILES} images allowed.`
      );
    }

    const pageSize =
      String(
        formData.get(
          "pageSize"
        ) ?? "Auto"
      ) as
        | "Auto"
        | "A4"
        | "Letter";

    const margin = Number(
      formData.get(
        "margin"
      ) ?? 20
    );

    const images: Array<{
      name: string;
      buffer: Uint8Array;
    }> = [];

    for (const image of uploads) {
      if (
        !SUPPORTED_TYPES.includes(
          image.type
        )
      ) {
        throw new ValidationError(
          `"${image.name}" is not a supported image format.`
        );
      }

      if (
        image.size === 0
      ) {
        throw new ValidationError(
          `"${image.name}" is empty.`
        );
      }

      images.push({
        name: image.name,
        buffer: new Uint8Array(
          await image.arrayBuffer()
        ),
      });
    }

    const pdf =
      await imageToPdf({
        images,
        pageSize,
        margin,
      });

    const now =
      new Date();

    const fileName = `Images-to-PDF-${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}.pdf`;

    return new NextResponse(
      Buffer.from(pdf),
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
      "[IMAGE_TO_PDF]",
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
          "Unable to convert images to PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
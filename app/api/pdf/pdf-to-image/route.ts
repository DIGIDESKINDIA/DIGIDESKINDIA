import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

import {
  PdfFile,
  ValidationError,
} from "@/lib/pdf";

import {
  pdfToImages,
} from "@/lib/pdf/pdf-to-image";

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
        "Maximum PDF size is 100 MB."
      );
    }

    const format = String(
      formData.get("format") ??
        "jpg"
    ) as "png" | "jpg";

    const quality = Number(
      formData.get("quality") ??
        90
    );

    const scaleValue = Number(
      formData.get("scale") ??
        1.5
    );

    const pagesRaw = String(
      formData.get("pages") ?? ""
    ).trim();

    const pages = pagesRaw
      ? pagesRaw
          .split(",")
          .map((value) =>
            Number(value.trim())
          )
          .filter((value) =>
            Number.isInteger(value)
          )
      : undefined;

    const pdf: PdfFile = {
      name: upload.name,
      size: upload.size,
      buffer:
        new Uint8Array(
          await upload.arrayBuffer()
        ),
    };

    const images =
      await pdfToImages({
        file: pdf,
        format,
        quality,
        pages,
        scale: scaleValue,
      });

    const zip = new JSZip();

    for (const image of images) {
      zip.file(
        image.filename,
        image.buffer
      );
    }

    const archive =
      await zip.generateAsync({
        type: "uint8array",
        compression:
          "DEFLATE",
        compressionOptions: {
          level: 9,
        },
      });

    const fileName = `${upload.name.replace(
      /\.pdf$/i,
      ""
    )}-images.zip`;

    return new NextResponse(
      Buffer.from(archive),
      {
        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition": `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[PDF_TO_IMAGE]",
      error
    );

    if (
      error instanceof
      ValidationError
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
          error instanceof Error
            ? error.message
            : "Unable to convert PDF to images.",
      },
      {
        status: 500,
      }
    );
  }
}
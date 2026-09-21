import { NextRequest, NextResponse } from "next/server";

import {
  PdfFile,
  ValidationError,
  PdfEngineError,
} from "@/lib/pdf";

import { addPageNumbers } from "@/lib/pdf/page-numbers";

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

    const startFrom = Number(
      formData.get("startFrom") ?? 1
    );

    const fontSize = Number(
      formData.get("fontSize") ?? 12
    );

    const x = Number(
      formData.get("x") ?? 0
    );

    const y = Number(
      formData.get("y") ?? 25
    );

    const positionValue = formData.get("position");
    const position =
      typeof positionValue === "string" && positionValue
        ? positionValue as "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
        : "bottom-center";

    const marginsValue = formData.get("margins");
    const margins =
      marginsValue === "narrow" || marginsValue === "wide"
        ? marginsValue
        : "default";

    const pagesValue =
      formData.get("pages");

    let pages:
      | number[]
      | undefined;

    if (
      typeof pagesValue ===
        "string" &&
      pagesValue.trim()
    ) {
      pages = pagesValue
        .split(",")
        .map((page) =>
          Number(page.trim())
        )
        .filter((page) =>
          Number.isInteger(page)
        );
    }

    const pdf: PdfFile = {
      name: upload.name,
      size: upload.size,
      buffer:
        new Uint8Array(
          await upload.arrayBuffer()
        ),
    };

    const output =
      await addPageNumbers({
        file: pdf,
        pages,
        startFrom,
        fontSize,
        position,
        margins,
        x,
        y,
      });

    const now = new Date();

    const fileName = `Page-Numbers-${now.getFullYear()}-${String(
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
      "[PAGE_NUMBERS]",
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
          "Unable to add page numbers.",
      },
      {
        status: 500,
      }
    );
  }
}
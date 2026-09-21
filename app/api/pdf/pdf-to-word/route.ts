// File: app/api/pdf/pdf-to-word/route.ts

import { NextRequest, NextResponse } from "next/server";

import {
  pdfToWord,
  pdfToWordOutputName,
  PDF_TO_WORD_MODES,
  PDF_TO_WORD_LANGUAGES,
} from "@/lib/pdf/pdf-to-word";

import { ValidationError } from "@/lib/pdf/errors";

export const runtime = "nodejs";

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(
  request: NextRequest
) {
  try {
    const form = await request.formData();

    const file = form.get("file") as File | null;

    const mode = String(
      form.get("mode") ?? "standard"
    ) as (typeof PDF_TO_WORD_MODES)[number];

    const language = String(
      form.get("language") ?? "eng"
    ) as (typeof PDF_TO_WORD_LANGUAGES)[number];

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "PDF file is required.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected PDF is empty.",
        },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !/\.pdf$/i.test(file.name)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload a valid PDF file.",
        },
        { status: 400 }
      );
    }

    if (!PDF_TO_WORD_MODES.includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported conversion mode.",
        },
        { status: 400 }
      );
    }

    if (!PDF_TO_WORD_LANGUAGES.includes(language)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported OCR language.",
        },
        { status: 400 }
      );
    }

    const addBorders = form.get("addBorders") === "true";

    const result = await pdfToWord({
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        buffer: new Uint8Array(
          await file.arrayBuffer()
        ),
      },
      mode,
      language,
      addBorders,
    });

    if (!result.success || !result.docx) {
      return NextResponse.json(result, { status: 422 });
    }

    const output = Buffer.from(result.docx);

    const fileName = result.outputName || pdfToWordOutputName(file.name);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(output.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF_TO_WORD_ROUTE]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "PDF to Word conversion failed.",
      },
      { status: 500 }
    );
  }
}
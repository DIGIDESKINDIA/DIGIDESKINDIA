import { NextRequest, NextResponse } from "next/server";

import { createOcrOutputName, normalizeOcrLanguages, processPdfOcr } from "@/lib/pdf/ocr";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function isPdfFile(file: File | null): file is File {
  if (!(file instanceof File)) {
    return false;
  }

  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function formatSseEvent(event: string, payload: unknown): string {
  return `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "PDF file is required." }, { status: 400 });
    }

    if (!isPdfFile(file)) {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF file." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ success: false, message: "Selected PDF is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "PDF files must be 50 MB or smaller." }, { status: 413 });
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const signature = pdfBuffer.subarray(0, 5).toString("ascii");
    if (!signature.startsWith("%PDF")) {
      return NextResponse.json({ success: false, message: "The uploaded file does not appear to be a valid PDF." }, { status: 422 });
    }

    if (/\/Encrypt\b/.test(pdfBuffer.toString("latin1"))) {
      return NextResponse.json({ success: false, message: "Password-protected PDFs are not supported." }, { status: 422 });
    }

    const languageValue = formData.get("language") ?? formData.get("languages");
    if (languageValue !== null) {
      const requestedLanguages = String(languageValue)
        .split(/[+,]/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const supportedLanguages = new Set(["eng", "hin"]);
      if (requestedLanguages.length === 0 || requestedLanguages.some((language) => !supportedLanguages.has(language))) {
        return NextResponse.json({ success: false, message: "Unsupported OCR language." }, { status: 400 });
      }
    }
    const languages = normalizeOcrLanguages(languageValue ? String(languageValue) : "eng");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(formatSseEvent(event, payload)));
        };

        try {
          const result = await processPdfOcr({
            fileName: file.name,
            pdfBytes: new Uint8Array(pdfBuffer),
            languages,
            onProgress: (message, progress, currentPage, totalPages) => {
              send("progress", {
                message,
                progress,
                currentPage,
                totalPages,
                status: "processing",
              });
            },
          });

          const outputName = createOcrOutputName(file.name);
          send("result", {
            success: true,
            outputName,
            pdfBase64: Buffer.from(result.bytes).toString("base64"),
            pages: result.pages,
            ocrPages: result.ocrPages,
            skippedPages: result.skippedPages,
            warnings: result.warnings,
            language: result.language,
          });

          controller.close();
        } catch (error) {
          console.error("[PDF_OCR_ROUTE]", error);
          send("error", {
            success: false,
            message: error instanceof Error ? error.message : "OCR failed while processing the PDF.",
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[PDF_OCR_ROUTE]", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "OCR processing failed." }, { status: 500 });
  }
}
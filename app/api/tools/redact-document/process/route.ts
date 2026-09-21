import { NextRequest, NextResponse } from "next/server";

import { applyRedactionsToPdf, sanitizeFilename } from "@/lib/pdf/redaction";
import { createRedactionJob } from "@/lib/tools/redaction-store";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function isValidPdf(file: File | null): boolean {
  return !!file && ((file.type === "application/pdf") || /\.pdf$/i.test(file.name));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawRedactions = formData.get("redactions");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "No PDF uploaded." }, { status: 400 });
    }

    if (!isValidPdf(file)) {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ success: false, message: "Selected PDF is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "PDF files must be 25 MB or smaller." }, { status: 413 });
    }

    const initialBytes = Buffer.from(await file.arrayBuffer());
    if (!initialBytes.subarray(0, 5).toString("ascii").startsWith("%PDF")) {
      return NextResponse.json({ success: false, message: "The uploaded file is not a valid PDF." }, { status: 422 });
    }

    let redactions: Array<{ id: string; page: number; x: number; y: number; width: number; height: number; label?: string }> = [];
    if (typeof rawRedactions === "string" && rawRedactions.trim()) {
      const parsed = JSON.parse(rawRedactions);
      if (Array.isArray(parsed)) {
        redactions = parsed;
      }
    }

    if (redactions.length === 0) {
      return NextResponse.json({ success: false, message: "Add at least one redaction area before finalizing." }, { status: 400 });
    }

    const outputBytes = await applyRedactionsToPdf(new Uint8Array(initialBytes), redactions);
    const token = await createRedactionJob(sanitizeFilename(file.name), outputBytes);

    return NextResponse.json({
      success: true,
      token,
      fileName: sanitizeFilename(file.name),
      downloadUrl: `/api/tools/redact-document/download/${token}`,
      pageCount: Math.max(1, redactions.length > 0 ? Math.max(...redactions.map((rect) => rect.page)) : 1),
    }, { status: 200 });
  } catch (error) {
    console.error("[REDACT_DOCUMENT_PROCESS]", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to redact this PDF securely.",
    }, { status: 500 });
  }
}

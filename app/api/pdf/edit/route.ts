import { NextRequest, NextResponse } from "next/server";

import { exportEditedPdf } from "@/lib/pdf/pdf-export.mjs";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type EditExportInput = {
  originalPdfBytes: Uint8Array;
  elements: unknown[];
  pageOrder?: Array<number | null>;
  pageRotations: Record<number, number>;
  addedPages: Array<{ pageIndex: number; width: number; height: number; rotation: number }>;
  baseUrl: string;
};

const exportDocument = exportEditedPdf as unknown as (input: EditExportInput) => Promise<Uint8Array>;

function parseJsonField(form: FormData, name: string, fallback: unknown) {
  const value = form.get(name);
  if (value == null || value === "" || value === "undefined") return fallback;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`Invalid ${name} payload.`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "PDF file is required." }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF file." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, message: "The selected PDF is empty." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, message: "PDF files must be 50 MB or smaller." }, { status: 413 });
    }

    const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    const elements = parseJsonField(form, "elements", []);
    const pageOrder = parseJsonField(form, "pageOrder", undefined);
    const pageRotations = parseJsonField(form, "pageRotations", {});
    const addedPages = parseJsonField(form, "addedPages", []);

    if (!Array.isArray(elements)) {
      return NextResponse.json({ success: false, message: "Invalid elements payload." }, { status: 400 });
    }

    const output = await exportDocument({
      originalPdfBytes,
      elements,
      pageOrder: Array.isArray(pageOrder) ? pageOrder : undefined,
      pageRotations: pageRotations && typeof pageRotations === "object" ? pageRotations : {},
      addedPages: Array.isArray(addedPages) ? addedPages : [],
      baseUrl: new URL(request.url).origin,
    });

    const filename = `${file.name.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._-]/g, "-") || "edited-document"}-edited.pdf`;
    return new NextResponse(Buffer.from(output), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF_EDIT]", error);
    const message = error instanceof Error ? error.message : "Unable to edit this PDF.";
    return NextResponse.json({ success: false, message }, { status: 422 });
  }
}

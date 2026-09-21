import { NextRequest, NextResponse } from "next/server";
import { signPdf } from '@/lib/pdf/esign';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeName(name: string) {
  return (name || "Signed Document").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "signed-document";
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const fieldsValue = form.get("fields");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "PDF file is required." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF file." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ success: false, message: "The selected PDF is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "PDF files must be 50 MB or smaller." }, { status: 413 });
    }

    const rawFields = typeof fieldsValue === "string" ? fieldsValue : fieldsValue instanceof Blob ? await fieldsValue.text() : null;
    if (!rawFields) {
      return NextResponse.json({ success: false, message: "Add at least one signature field before signing." }, { status: 400 });
    }

    let parsedFields;
    try {
      parsedFields = JSON.parse(rawFields);
    } catch {
      return NextResponse.json({ success: false, message: "Signature field payload is invalid." }, { status: 400 });
    }

    if (!Array.isArray(parsedFields) || parsedFields.length === 0) {
      return NextResponse.json({ success: false, message: "Add at least one signature field before signing." }, { status: 400 });
    }

    const result = await signPdf({
      file: new Uint8Array(await file.arrayBuffer()),
      fields: parsedFields,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.statusCode || 422 });
    }

    const publicName = sanitizeName(file.name.replace(/\.pdf$/i, "") || "signed-document");
    return NextResponse.json({
      success: true,
      message: "PDF signed successfully.",
      fileName: `${publicName}-signed.pdf`,
      downloadUrl: `data:application/pdf;base64,${Buffer.from(result.bytes || []).toString("base64")}`,
    });
  } catch (error) {
    console.error("[SIGN_PDF_SELF_SIGN]", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unable to sign this PDF." }, { status: 422 });
  }
}

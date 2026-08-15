import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import { createDownloadResponse, imageFilesToPdf, readMultipleImageFiles } from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = await readMultipleImageFiles(formData);

    const pdfBuffer = await imageFilesToPdf(files);

    return createDownloadResponse(pdfBuffer, "images-to-pdf.pdf", "application/pdf");
  } catch (error) {
    console.error("[IMAGE_TO_PDF]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to convert images to PDF." }, { status: 500 });
  }
}

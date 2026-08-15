import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import {
  createDownloadResponse,
  convertImageFile,
  getSupportedOutputFormats,
  readSingleImageFile,
  type ImageFormat,
} from "@/lib/image";

export const runtime = "nodejs";

function getFormats() {
  return getSupportedOutputFormats();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);
    const format = String(formData.get("format") ?? "png").toLowerCase() as ImageFormat;
    const quality = Number(formData.get("quality") ?? 85);
    const formats = getFormats();

    if (!formats.includes(format)) {
      throw new ValidationError("Unsupported output format.");
    }

    if (!Number.isFinite(quality)) {
      throw new ValidationError("Quality must be a number.");
    }

    const result = await convertImageFile(file, format, quality);
    return createDownloadResponse(result.buffer, result.fileName, result.contentType);
  } catch (error) {
    console.error("[IMAGE_CONVERT]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to convert image." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    formats: getFormats(),
  });
}

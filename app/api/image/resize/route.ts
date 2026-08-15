import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import { createDownloadResponse, readSingleImageFile, resizeImageFile } from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);
    const width = Number(formData.get("width") ?? 0);
    const height = Number(formData.get("height") ?? 0);

    if (!width && !height) {
      throw new ValidationError("Width or height is required.");
    }

    const result = await resizeImageFile(file, { width, height });
    return createDownloadResponse(result.buffer, result.fileName, result.contentType);
  } catch (error) {
    console.error("[IMAGE_RESIZE]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to resize image." }, { status: 500 });
  }
}

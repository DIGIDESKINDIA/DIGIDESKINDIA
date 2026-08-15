import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import { createDownloadResponse, cropImageFile, readSingleImageFile } from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);

    const left = Number(formData.get("left") ?? 0);
    const top = Number(formData.get("top") ?? 0);
    const width = Number(formData.get("width") ?? 0);
    const height = Number(formData.get("height") ?? 0);

    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) {
      throw new ValidationError("Crop coordinates must be numbers.");
    }

    const result = await cropImageFile(file, { left, top, width, height });
    return createDownloadResponse(result.buffer, result.fileName, result.contentType);
  } catch (error) {
    console.error("[IMAGE_CROP]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to crop image." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import { createDownloadResponse, readSingleImageFile, rotateImageFile } from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);
    const angle = Number(formData.get("angle") ?? 90);
    const flipHorizontal = String(formData.get("flipHorizontal") ?? "false") === "true";
    const flipVertical = String(formData.get("flipVertical") ?? "false") === "true";

    if (!Number.isFinite(angle)) {
      throw new ValidationError("Rotation angle must be a number.");
    }

    if (![90, 180, 270].includes(angle)) {
      throw new ValidationError("Rotation angle must be 90, 180 or 270.");
    }

    const result = await rotateImageFile(file, {
      angle,
      flipHorizontal,
      flipVertical,
    });
    return createDownloadResponse(result.buffer, result.fileName, result.contentType);
  } catch (error) {
    console.error("[IMAGE_ROTATE]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to rotate image." }, { status: 500 });
  }
}

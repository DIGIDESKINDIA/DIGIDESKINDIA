import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import {
  createDownloadResponse,
  readSingleImageFile,
  removeImageBackground,
} from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);

    const toleranceRaw = Number(formData.get("tolerance") ?? 40);
    const tolerance = Number.isFinite(toleranceRaw) ? toleranceRaw : 40;

    const result = await removeImageBackground(file, { tolerance });

    return createDownloadResponse(result.buffer, result.fileName, result.contentType, {
      "X-Original-Size": String(result.originalSize),
      "X-Output-Size": String(result.outputSize),
    });
  } catch (error) {
    console.error("[IMAGE_REMOVE_BACKGROUND]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { success: false, message: "Unable to remove the background from this image." },
      { status: 500 }
    );
  }
}
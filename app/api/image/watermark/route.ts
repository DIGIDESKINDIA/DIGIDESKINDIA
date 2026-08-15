import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import { createDownloadResponse, readSingleImageFile, watermarkImageFile } from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);

    const text = String(formData.get("text") ?? "").trim();
    const opacity = Number(formData.get("opacity") ?? 0.25);
    const fontSize = Number(formData.get("fontSize") ?? 42);
    const color = String(formData.get("color") ?? "#ffffff");
    const position = String(formData.get("position") ?? "center") as "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

    if (!text) {
      throw new ValidationError("Watermark text is required.");
    }

    const result = await watermarkImageFile(file, {
      text,
      opacity,
      fontSize,
      color,
      position,
    });

    return createDownloadResponse(result.buffer, result.fileName, result.contentType);
  } catch (error) {
    console.error("[IMAGE_WATERMARK]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to watermark image." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import {
  compressImageFile,
  createDownloadResponse,
  getSupportedOutputFormats,
  readSingleImageFile,
  type ImageFormat,
} from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);
    const quality = Number(formData.get("quality") ?? 80);
    const outputFormat = String(formData.get("format") ?? "auto").toLowerCase();

    const supportedFormats = getSupportedOutputFormats();

    const targetFormat = outputFormat === "auto"
      ? undefined
      : outputFormat as ImageFormat;

    if (targetFormat && !supportedFormats.includes(targetFormat)) {
      throw new ValidationError("Unsupported output format.");
    }

    if (!Number.isFinite(quality)) {
      throw new ValidationError("Quality must be a number.");
    }

    const result = await compressImageFile(file, quality, targetFormat);

    const reductionPercent = result.originalSize > 0
      ? Math.max(
          0,
          ((result.originalSize - result.outputSize) / result.originalSize) * 100
        )
      : 0;

    return createDownloadResponse(result.buffer, result.fileName, result.contentType, {
      "X-Original-Size": String(result.originalSize),
      "X-Output-Size": String(result.outputSize),
      "X-Reduction-Percent": reductionPercent.toFixed(2),
    });
  } catch (error) {
    console.error("[IMAGE_COMPRESS]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to compress image." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    formats: ["auto", ...getSupportedOutputFormats()],
  });
}

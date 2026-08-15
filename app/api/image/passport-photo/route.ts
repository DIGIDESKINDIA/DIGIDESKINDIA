import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/pdf/errors";
import {
  createDownloadResponse,
  createPassportPhotoSheet,
  readSingleImageFile,
  type PassportOutputFormat,
} from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = await readSingleImageFile(formData);

    const outputFormat = String(formData.get("outputFormat") ?? "jpg").toLowerCase() as PassportOutputFormat;
    const target = String(formData.get("target") ?? "india-passport") as "india-passport" | "india-visa";
    const copies = Number(formData.get("copies") ?? 8);
    const yOffset = Number(formData.get("yOffset") ?? 0);
    const quality = Number(formData.get("quality") ?? 92);

    if (outputFormat !== "jpg" && outputFormat !== "pdf") {
      throw new ValidationError("Unsupported passport output format.");
    }

    if (target !== "india-passport" && target !== "india-visa") {
      throw new ValidationError("Unsupported photo target.");
    }

    if (!Number.isFinite(copies) || copies < 1 || copies > 30) {
      throw new ValidationError("Copies must be between 1 and 30.");
    }

    if (!Number.isFinite(yOffset) || yOffset < -100 || yOffset > 100) {
      throw new ValidationError("Vertical offset must be between -100 and 100.");
    }

    if (!Number.isFinite(quality) || quality < 60 || quality > 100) {
      throw new ValidationError("Quality must be between 60 and 100.");
    }

    const result = await createPassportPhotoSheet({
      file,
      outputFormat,
      target,
      copies: Math.floor(copies),
      yOffset,
      quality,
    });

    return createDownloadResponse(result.buffer, result.fileName, result.contentType, {
      "X-Copies-Placed": String(result.copiesPlaced),
      "X-Sheet-Width": String(result.sheetWidth),
      "X-Sheet-Height": String(result.sheetHeight),
    });
  } catch (error) {
    console.error("[PASSPORT_PHOTO]", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, message: "Unable to generate passport photo sheet." }, { status: 500 });
  }
}
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { RATE_LIMITS } from "@/lib/tools/metadata-remover/constants.ts";
import { InvalidFileError, UnsupportedFileTypeError } from "@/lib/tools/metadata-remover/errors.ts";
import { PdfMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/pdf.analyzer.ts";
import { OfficeMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/office.analyzer.ts";
import { ImageMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/image.analyzer.ts";
import { detectFileType, getSupportedMimeTypes, isAllowedExtension, sanitizeFilename, validateFileSize, validateMagicBytes, validateMimeType } from "@/lib/tools/metadata-remover/validation.ts";
import { checkMetadataRateLimit, getClientIpKey } from "@/lib/tools/metadata-remover/rate-limit.ts";
import { createJobDirectory, deleteJob, writeJobState } from "@/lib/tools/metadata-remover/secure-store.ts";
import type { JobState } from "@/lib/tools/metadata-remover/types.ts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let jobDir: string | undefined;
  try {
    if (!checkMetadataRateLimit(getClientIpKey(request, "metadata-analyze"), RATE_LIMITS.analyze.limit, RATE_LIMITS.analyze.windowMs)) {
      return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many analyze requests. Please try again later." } }, { status: 429 });
    }

    const formData = await request.formData();
    const upload = formData.get("file");
    if (!(upload instanceof File)) {
      throw new InvalidFileError();
    }

    const fileName = upload.name || "document";
    if (!isAllowedExtension(fileName)) {
      throw new UnsupportedFileTypeError();
    }

    const detectedType = detectFileType(fileName, upload.type || undefined);
    if (!detectedType) {
      throw new UnsupportedFileTypeError();
    }

    validateMimeType(upload.type || "", getSupportedMimeTypes()[detectedType]);
    validateFileSize(detectedType, upload.size);

    const buffer = Buffer.from(await upload.arrayBuffer());
    validateMagicBytes(buffer, detectedType);

    const { jobId, dir, inputDir } = await createJobDirectory();
    jobDir = dir;
    const safeInputName = sanitizeFilename(fileName).replace(/-cleaned\./, ".");
    const inputPath = path.join(inputDir, safeInputName);
    await mkdir(path.dirname(inputPath), { recursive: true });
    await writeFile(inputPath, buffer, { mode: 0o600 });

    let analyzer;
    if (detectedType === "pdf") {
      analyzer = new PdfMetadataAnalyzer();
    } else if (["docx", "xlsx", "pptx"].includes(detectedType)) {
      analyzer = new OfficeMetadataAnalyzer();
    } else {
      analyzer = new ImageMetadataAnalyzer();
    }

    const metadata = await analyzer.analyze(inputPath);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const state: JobState = {
      jobId,
      createdAt: new Date().toISOString(),
      expiresAt,
      fileName: fileName,
      fileType: detectedType,
      mimeType: upload.type || "application/octet-stream",
      originalSize: upload.size,
      inputPath,
      status: "analyzed",
      analysis: metadata,
    };
    await writeJobState(dir, state);

    return NextResponse.json({
      success: true,
      jobId,
      file: {
        name: fileName,
        type: detectedType,
        size: upload.size,
        mimeType: upload.type || "application/octet-stream",
      },
      metadata,
      expiresAt,
    }, { status: 200 });
  } catch (error: unknown) {
    if (jobDir) await deleteJob(jobDir).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Unable to analyze metadata.";
    const code = typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: string }).code === "string" ? (error as { code: string }).code : "ANALYZE_FAILED";
    const status = typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: number }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 400;
    return NextResponse.json({ success: false, error: { code, message } }, { status });
  }
}

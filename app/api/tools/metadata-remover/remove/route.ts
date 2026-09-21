import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { RATE_LIMITS } from "@/lib/tools/metadata-remover/constants.ts";
import { InvalidFileError, UnsupportedFileTypeError } from "@/lib/tools/metadata-remover/errors.ts";
import { PdfMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/pdf.analyzer.ts";
import { OfficeMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/office.analyzer.ts";
import { ImageMetadataAnalyzer } from "@/lib/tools/metadata-remover/analyzers/image.analyzer.ts";
import { PdfMetadataRemover } from "@/lib/tools/metadata-remover/removers/pdf.remover.ts";
import { OfficeMetadataRemover } from "@/lib/tools/metadata-remover/removers/office.remover.ts";
import { ImageMetadataRemover } from "@/lib/tools/metadata-remover/removers/image.remover.ts";
import { MetadataVerifier } from "@/lib/tools/metadata-remover/verifier.ts";
import { detectFileType, getSupportedMimeTypes, isAllowedExtension, sanitizeFilename, validateFileSize, validateMagicBytes, validateMimeType } from "@/lib/tools/metadata-remover/validation.ts";
import { checkMetadataRateLimit, getClientIpKey } from "@/lib/tools/metadata-remover/rate-limit.ts";
import { createJobDirectory, deleteJob, writeJobState } from "@/lib/tools/metadata-remover/secure-store.ts";
import type { JobState } from "@/lib/tools/metadata-remover/types.ts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let jobDir: string | undefined;
  try {
    if (!checkMetadataRateLimit(getClientIpKey(request, "metadata-remove"), RATE_LIMITS.remove.limit, RATE_LIMITS.remove.windowMs)) {
      return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many removal requests. Please try again later." } }, { status: 429 });
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

    const type = detectFileType(fileName, upload.type || undefined);
    if (!type) {
      throw new UnsupportedFileTypeError();
    }

    validateMimeType(upload.type || "", getSupportedMimeTypes()[type]);
    validateFileSize(type, upload.size);

    const buffer = Buffer.from(await upload.arrayBuffer());
    validateMagicBytes(buffer, type);

    const { jobId, dir, inputDir, outputDir } = await createJobDirectory();
    jobDir = dir;
    const safeInputName = sanitizeFilename(fileName).replace(/-cleaned\./, ".");
    const inputPath = path.join(inputDir, safeInputName);
    const outputName = sanitizeFilename(fileName);
    const outputPath = path.join(outputDir, outputName);
    await writeFile(inputPath, buffer, { mode: 0o600 });

    const originalAnalysis = type === "pdf" ? await new PdfMetadataAnalyzer().analyze(inputPath) : type === "docx" || type === "xlsx" || type === "pptx" ? await new OfficeMetadataAnalyzer().analyze(inputPath) : await new ImageMetadataAnalyzer().analyze(inputPath);

    const remover = type === "pdf" ? new PdfMetadataRemover() : type === "docx" || type === "xlsx" || type === "pptx" ? new OfficeMetadataRemover() : new ImageMetadataRemover();
    await remover.remove(inputPath, outputPath);

    const verification = await new MetadataVerifier().verifyCleanFile(outputPath, type);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = randomBytes(32).toString("hex");
    const state: JobState = {
      jobId,
      createdAt: new Date().toISOString(),
      expiresAt,
      fileName: fileName,
      fileType: type,
      mimeType: upload.type || "application/octet-stream",
      originalSize: upload.size,
      inputPath,
      outputPath,
      outputName,
      downloadToken: token,
      downloadUrl: `/api/tools/metadata-remover/download/${token}`,
      status: "removed",
      analysis: originalAnalysis,
      verified: verification.verified,
      removal: {
        success: verification.verified,
        verified: verification.verified,
        removedCount: originalAnalysis.count,
        remainingMetadata: verification.remainingMetadata,
      },
    };

    await writeJobState(dir, state);

    return NextResponse.json({
      success: true,
      jobId,
      downloadToken: token,
      downloadUrl: state.downloadUrl,
      original: { size: upload.size, metadataCount: originalAnalysis.count },
      cleaned: { size: (await readFile(outputPath)).length, metadataCount: 0, verified: verification.verified },
      expiresAt,
    }, { status: 200 });
  } catch (error: unknown) {
    if (jobDir) await deleteJob(jobDir).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Unable to remove metadata.";
    const code = typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: string }).code === "string" ? (error as { code: string }).code : "REMOVE_FAILED";
    const status = typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: number }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 400;
    return NextResponse.json({ success: false, error: { code, message } }, { status });
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { RATE_LIMITS } from "@/lib/tools/metadata-remover/constants.ts";
import { checkMetadataRateLimit, getClientIpKey } from "@/lib/tools/metadata-remover/rate-limit.ts";
import { findJobByToken } from "@/lib/tools/metadata-remover/secure-store.ts";
import type { SupportedFileType } from "@/lib/tools/metadata-remover/types.ts";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!checkMetadataRateLimit(getClientIpKey(request, "metadata-download"), RATE_LIMITS.download.limit, RATE_LIMITS.download.windowMs)) {
      return new NextResponse(null, { status: 429 });
    }

    const { token } = await params;
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return new NextResponse(null, { status: 404 });
    }
    const match = await findJobByToken(token);
    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const { state } = match;
    if (!state.outputPath || !state.outputName || (state.expiresAt && new Date(state.expiresAt).getTime() <= Date.now())) {
      return new NextResponse(null, { status: 404 });
    }

    const outputRoot = path.resolve(match.jobDir, "output") + path.sep;
    if (!path.resolve(state.outputPath).startsWith(outputRoot)) {
      return new NextResponse(null, { status: 404 });
    }

    const file = await readFile(state.outputPath);
    const mimeTypes: Record<SupportedFileType, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const safeName = path.basename(state.outputName).replace(/[\r\n"\\]/g, "_");
    const response = new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[state.fileType] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });

    return response;
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

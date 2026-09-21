import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { compressPdf as compressWithAdobe } from "@/lib/pdf/adobe-services";

export const runtime = "nodejs";

const PDF_WORKER_URL = process.env.PDF_WORKER_URL?.trim();

function safeName(name: string) {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .trim() || "document";

  return `${base}-compressed.pdf`;
}

async function compressLocally(input: Uint8Array) {
  const pdf = await PDFDocument.load(input, {
    updateMetadata: false,
  });

  return new Uint8Array(
    await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    })
  );
}

function providerConfigured() {
  return Boolean(
    process.env.PDF_SERVICES_CLIENT_ID?.trim() &&
      process.env.PDF_SERVICES_CLIENT_SECRET?.trim()
  );
}

function getCompressionQuality(level: number) {
  if (level >= 70) {
    return "low";
  }

  if (level <= 30) {
    return "high";
  }

  return "medium";
}

function getTargetBytesForLevel(
  originalBytes: number,
  level: number
) {
  const ratio = level < 70
    ? Math.max(0.1, 1 - level * 0.012)
    : Math.max(0.01, 0.1 - (level - 70) * 0.0102);

  return Math.floor(originalBytes * ratio);
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf || file.size === 0) {
      return NextResponse.json({ error: "Please upload a non-empty PDF file." }, { status: 400 });
    }

    const levelValue = String(
      formData.get("compressionLevel") ?? "60"
    ).trim();
    const compressionLevel = Math.floor(Number(levelValue));

    if (
      !Number.isFinite(compressionLevel) ||
      compressionLevel < 1 ||
      compressionLevel > 100
    ) {
      return NextResponse.json(
        { error: "Compression level must be between 1 and 100." },
        { status: 400 }
      );
    }

    const quality = getCompressionQuality(compressionLevel);

    const source = new Uint8Array(await file.arrayBuffer());
    const targetBytes = getTargetBytesForLevel(
      source.length,
      compressionLevel
    );
    const workerForm = new FormData();
    workerForm.append("file", file, file.name);
    workerForm.append("quality", quality);
    workerForm.append("compressionLevel", String(compressionLevel));

    if (targetBytes < source.length) {
      workerForm.append("targetBytes", String(targetBytes));
      workerForm.append("targetSize", String(targetBytes));
    }

    console.log(
      `[COMPRESS_PDF] level=${compressionLevel} target=${targetBytes} original=${file.size} bytes`
    );

    let response: Response | null = null;
    let output: Uint8Array;
    let preset = "local-rewrite";
    let attemptCount = "1";
    let strategy = "local-pdf-rewrite";

    if (PDF_WORKER_URL) {
      try {
        response = await fetch(`${PDF_WORKER_URL}/compress`, {
          method: "POST",
          body: workerForm,
          cache: "no-store",
          signal: AbortSignal.timeout(120000),
        });
      } catch {
        response = null;
      }
    }

    if (response?.ok) {
      output = new Uint8Array(await response.arrayBuffer());
      preset = response.headers.get("X-Compression-Preset") || "worker";
      attemptCount = response.headers.get("X-Attempt-Count") || "0";
      strategy = response.headers.get("X-Compression-Strategy") || "worker";
    } else if (providerConfigured()) {
      output = new Uint8Array(
        await compressWithAdobe(source, quality)
      );
      preset = "adobe";
      attemptCount = "1";
      strategy = "adobe-provider";
    } else {
      output = await compressLocally(source);
    }

    if (output.length >= source.length) {
      output = source;
      preset = "original-preserved";
    }

    if (response && !response.ok && !providerConfigured()) {
      const text = await response.text();
      console.warn("[COMPRESS_PDF] worker failed; using local fallback", text);
    }

    if (output.length === 0) {
      throw new Error("PDF compression returned an empty file.");
    }

    const originalSize = file.size;
    const compressedSize = output.length;
    const reductionPercent = originalSize > 0
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 10000) / 100)
      : 0;
    console.log(
      `[COMPRESS_PDF] final=${compressedSize} bytes level=${compressionLevel}`
    );

    const outputBody = output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength
    ) as ArrayBuffer;

    return new NextResponse(outputBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName(file.name)}"`,
        "Content-Length": String(compressedSize),
        "X-Original-Size": String(originalSize),
        "X-Compressed-Size": String(compressedSize),
        "X-Saved-Bytes": String(Math.max(0, originalSize - compressedSize)),
        "X-Reduction-Percent": String(reductionPercent),
        "X-Compression-Preset": preset,
        "X-Target-Size": "0",
        "X-Target-Bytes": "0",
        "X-Output-Bytes": String(compressedSize),
        "X-Target-Reached": "false",
        "X-Best-Achievable": "false",
        "X-Compression-Level": String(compressionLevel),
        "X-Best-Achievable-Bytes": String(compressedSize),
        "X-Attempt-Count": attemptCount,
        "X-Compression-Attempts": attemptCount,
        "X-Compression-Strategy": strategy,
        "X-Processing-Time-Ms": String(Math.round(performance.now() - startedAt)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[COMPRESS_PDF]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to compress PDF." },
      { status: 500 }
    );
  }
}

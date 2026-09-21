import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { compressPdf as compressWithAdobe } from "@/lib/pdf/adobe-services";
import { computeCompressionStats } from "@/lib/pdf/compression-stats";

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

async function validatePdfBytes(bytes: Uint8Array, label: string) {
  try {
    const pdf = await PDFDocument.load(bytes, {
      updateMetadata: false,
    });

    if (pdf.getPageCount() < 1) {
      throw new Error("The PDF contains no pages.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/password|encrypted|requires a password/i.test(message)) {
      throw new Error("Password-protected PDFs are not supported.");
    }

    throw new Error(`The ${label} PDF is invalid or corrupted.`);
  }
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

    await validatePdfBytes(source, "uploaded");

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

    if (output.length === 0) {
      throw new Error("PDF compression returned an empty file.");
    }

    await validatePdfBytes(output, "compressed");

    const originalSize = file.size;
    const preservedOriginal = output.length >= source.length;

    if (preservedOriginal) {
      output = source;
      preset = "original-preserved";
      strategy = "original-preserved";
    }

    if (response && !response.ok && !providerConfigured()) {
      const text = await response.text();
      console.warn("[COMPRESS_PDF] worker failed; using local fallback", text);
    }

    const finalStats = computeCompressionStats(originalSize, output.length);
    const notice =
      finalStats.compressedSize >= finalStats.originalSize && finalStats.originalSize > 0
        ? "Compression did not reduce the file size, so the original file was kept."
        : undefined;

    console.log(
      `[COMPRESS_PDF] final=${finalStats.compressedSize} bytes level=${compressionLevel}`
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
        "Content-Length": String(finalStats.compressedSize),
        "X-Original-Size": String(finalStats.originalSize),
        "X-Compressed-Size": String(finalStats.compressedSize),
        "X-Saved-Bytes": String(finalStats.savedBytes),
        "X-Reduction-Percent": String(finalStats.reductionPercent),
        "X-Compression-Preset": preset,
        "X-Target-Size": "0",
        "X-Target-Bytes": "0",
        "X-Output-Bytes": String(finalStats.compressedSize),
        "X-Target-Reached": String(finalStats.isReduced),
        "X-Best-Achievable": String(finalStats.isReduced),
        "X-Compression-Level": String(compressionLevel),
        "X-Best-Achievable-Bytes": String(finalStats.compressedSize),
        "X-Attempt-Count": attemptCount,
        "X-Compression-Attempts": attemptCount,
        "X-Compression-Strategy": strategy,
        "X-Compression-Notice": notice ?? "",
        "X-Compression-Outcome": finalStats.isReduced ? "compressed" : "original-preserved",
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

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

function safeBaseName(name: string) {
  return (
    name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "-")
      .trim() || "document"
  );
}

function normalizeRanges(value: string) {
  const cleaned = value
    .replace(/[^0-9,\-zZ ]/g, "")
    .trim();

  return cleaned || "1-z";
}

function expandRangeToken(
  token: string,
  totalPages: number
): number[] {
  const value = token.trim();

  if (!value) return [];

  if (/^\d+$/.test(value)) {
    const page = Number(value);

    if (
      Number.isInteger(page) &&
      page >= 1 &&
      page <= totalPages
    ) {
      return [page];
    }

    return [];
  }

  const match = value.match(
    /^(\d+|z)\s*-\s*(\d+|z)$/i
  );

  if (!match) return [];

  const start =
    match[1].toLowerCase() === "z"
      ? totalPages
      : Number(match[1]);

  const end =
    match[2].toLowerCase() === "z"
      ? totalPages
      : Number(match[2]);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < 1 ||
    start > totalPages ||
    end > totalPages
  ) {
    return [];
  }

  const pages: number[] = [];

  const from = Math.min(start, end);
  const to = Math.max(start, end);

  for (let page = from; page <= to; page++) {
    pages.push(page);
  }

  return pages;
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const rangesInput = String(
      formData.get("ranges") ?? ""
    ).trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "PDF file is required.",
        },
        { status: 400 }
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload a valid PDF file.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected PDF is empty.",
        },
        { status: 400 }
      );
    }

    const ranges = normalizeRanges(
      rangesInput || "1-z"
    );

    const source = await PDFDocument.load(
      await file.arrayBuffer(),
      { updateMetadata: false }
    );
    const pages = ranges
      .split(",")
      .flatMap((token) => expandRangeToken(token, source.getPageCount()));
    const selectedPages = [...new Set(pages)];

    if (!selectedPages.length) {
      return NextResponse.json(
        { success: false, message: "No valid pages selected." },
        { status: 400 }
      );
    }

    const selected = await PDFDocument.create();
    const copied = await selected.copyPages(
      source,
      selectedPages.map((page) => page - 1)
    );
    copied.forEach((page) => selected.addPage(page));
    const pdfBuffer = Buffer.from(
      await selected.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      })
    );

    if (pdfBuffer.length === 0) {
      throw new Error(
        "PDF worker returned an empty file."
      );
    }

    /*
     * Worker फिलहाल selected pages का एक PDF देता है.
     * इसलिए frontend compatibility के लिए ZIP बनाया जा रहा है.
     */
    const zip = new JSZip();

    const baseName = safeBaseName(file.name);

    zip.file(
      `${baseName}-split.pdf`,
      pdfBuffer
    );

    const archive = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: {
        level: 1,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[PDF_PERF] split location=next-local pages=${selectedPages.length} total=${Math.round(performance.now() - startedAt)}ms`
      );
    }

    return new NextResponse(
      new Uint8Array(archive),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${baseName}-split.zip"`,

          "Content-Length":
            String(archive.byteLength),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[PDF_SPLIT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to split PDF.",
      },
      { status: 500 }
    );
  }
}
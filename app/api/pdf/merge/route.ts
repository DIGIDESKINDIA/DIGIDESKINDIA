import { NextRequest, NextResponse } from "next/server";
import { mergePdfBuffers } from "@/lib/pdf/merge";

export const runtime = "nodejs";

function safeName(name: string) {
  const base =
    name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "-")
      .trim() || "merged";

  return `${base}-merged.pdf`;
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimum two PDFs required.",
        },
        { status: 400 }
      );
    }

    const buffers: Buffer[] = [];

    for (const item of files) {
      if (!(item instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please upload valid PDF files.",
          },
          { status: 400 }
        );
      }

      const isPdf =
        item.type === "application/pdf" ||
        item.name.toLowerCase().endsWith(".pdf");

      if (!isPdf || item.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Please upload valid non-empty PDF files.",
          },
          { status: 400 }
        );
      }

      buffers.push(Buffer.from(await item.arrayBuffer()));
    }

    const output = await mergePdfBuffers(buffers);

    if (output.length === 0) {
      throw new Error("PDF merge returned an empty file.");
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[PDF_PERF] merge location=next-local files=${files.length} total=${Math.round(performance.now() - startedAt)}ms`
      );
    }

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName(
          (files[0] as File).name
        )}"`,
        "Content-Length": String(output.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF_MERGE]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to merge PDFs.",
      },
      { status: 500 }
    );
  }
}
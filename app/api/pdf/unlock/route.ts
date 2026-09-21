import { NextRequest, NextResponse } from "next/server";
import { unlockPdfWithFallback } from "@/lib/pdf/secure-fallback";

export const runtime = "nodejs";

function safeBaseName(name: string) {
  return (
    name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "-")
      .trim() || "document"
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const upload =
      formData.get("file");

    const password = String(
      formData.get("password") ?? ""
    ).trim();

    if (!(upload instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No PDF selected.",
        },
        { status: 400 }
      );
    }

    const isPdf =
      upload.type === "application/pdf" ||
      upload.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please upload a valid PDF.",
        },
        { status: 400 }
      );
    }

    if (upload.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected PDF is empty.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter the PDF password.",
        },
        { status: 400 }
      );
    }

    const output = await unlockPdfWithFallback(
      new Uint8Array(await upload.arrayBuffer()),
      password
    );

    if (output.length === 0) {
      throw new Error(
        "PDF worker returned an empty file."
      );
    }

    const fileName =
      `${safeBaseName(
        upload.name
      )}-unlocked.pdf`;

    return new NextResponse(
      new Uint8Array(output),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Content-Length":
            String(output.length),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[UNLOCK_PDF]",
      error
    );

    const dependencyUnavailable =
      error instanceof Error &&
      error.message.includes("requires qpdf installed");

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to unlock PDF.",
      },
      { status: dependencyUnavailable ? 503 : 500 }
    );
  }
}
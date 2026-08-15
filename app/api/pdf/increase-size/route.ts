import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 150 * 1024 * 1024;

function safeFileName(name: string) {
  const clean = name
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const base = clean.toLowerCase().endsWith(".pdf")
    ? clean.slice(0, -4)
    : clean;

  return `${base || "document"}-increased.pdf`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const targetRaw = formData.get("targetBytes");

    // Validate file
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Please select a PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    // Validate PDF
    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      return NextResponse.json(
        {
          error: "Only PDF files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    // Empty file protection
    if (file.size <= 0) {
      return NextResponse.json(
        {
          error: "Selected PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    // Upload limit
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          error: "Maximum upload size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    // Read requested target
    const targetBytes = Number(targetRaw);

    if (
      !Number.isFinite(targetBytes) ||
      !Number.isInteger(targetBytes) ||
      targetBytes <= 0
    ) {
      return NextResponse.json(
        {
          error: "Please enter a valid target size.",
        },
        {
          status: 400,
        }
      );
    }

    // Increase tool should only increase
    if (targetBytes <= file.size) {
      return NextResponse.json(
        {
          error:
            "Target size must be larger than the original PDF.",
        },
        {
          status: 400,
        }
      );
    }

    // Output safety limit
    if (targetBytes > MAX_OUTPUT_SIZE) {
      return NextResponse.json(
        {
          error: "Maximum output size is 150 MB.",
        },
        {
          status: 400,
        }
      );
    }

    // Read original PDF
    const arrayBuffer = await file.arrayBuffer();

    const original = Buffer.from(arrayBuffer);

    const bytesToAdd =
      targetBytes - original.length;

    if (bytesToAdd <= 0) {
      return NextResponse.json(
        {
          error:
            "Target size must be larger than the original PDF.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * DIGITAL DESK - FAST PDF SIZE INCREASE
     *
     * We do NOT rasterize the PDF.
     * We do NOT recompress images.
     * We do NOT change resolution.
     *
     * The original PDF bytes remain unchanged.
     *
     * Additional trailing bytes are added after
     * the existing PDF data to reach the selected
     * target file size.
     *
     * Advantages:
     *
     * - Extremely fast
     * - Original visible quality preserved
     * - No Ghostscript required
     * - Exact requested byte size
     */

    const output =
      Buffer.alloc(targetBytes, 0x20);

    // Copy original PDF exactly
    original.copy(output, 0);

    /*
     * Optional harmless marker inside the
     * trailing padding area.
     */
    const marker = Buffer.from(
      "\n%DIGITAL-DESK-PDF-SIZE-PADDING\n",
      "ascii"
    );

    if (bytesToAdd >= marker.length) {
      marker.copy(
        output,
        original.length
      );
    }

    /*
     * Verify exact output size.
     */
    if (output.length !== targetBytes) {
      throw new Error(
        "Could not create requested PDF size."
      );
    }

    const addedBytes =
      output.length - original.length;

    console.log(
      `[Digital Desk] Increase PDF Size`
    );

    console.log(
      `[Digital Desk] Original: ${original.length} bytes`
    );

    console.log(
      `[Digital Desk] Target: ${targetBytes} bytes`
    );

    console.log(
      `[Digital Desk] Final: ${output.length} bytes`
    );

    console.log(
      `[Digital Desk] Added: ${addedBytes} bytes`
    );

    // Return increased PDF
    return new NextResponse(
      new Uint8Array(output),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeFileName(
              file.name
            )}"`,

          "Content-Length":
            String(output.length),

          "X-Original-Size":
            String(original.length),

          "X-Output-Size":
            String(output.length),

          "X-Added-Bytes":
            String(addedBytes),

          "X-Target-Size":
            String(targetBytes),

          "Cache-Control":
            "no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Digital Desk] Increase PDF Size failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not increase PDF size.",
      },
      {
        status: 500,
      }
    );
  }
}
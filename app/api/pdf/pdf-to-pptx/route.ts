import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  pdfToPptx,
  pdfToPptxOutputName,
} from "@/lib/pdf/pdf-to-pptx";
import { PDF_TO_PPTX_MAX_FILE_SIZE } from "@/lib/pdf/pdf-to-pptx-config";
import { ValidationError } from "@/lib/pdf/errors";
import { createPdfToPptxJob } from "@/lib/pdf/pdf-to-pptx-jobs";

export const runtime = "nodejs";

const PPTX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const PDF_SIGNATURE = "%PDF";

export async function POST(request: NextRequest) {
  let workingDirectory: string | undefined;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "PDF file is required." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ success: false, message: "Selected PDF is empty." }, { status: 400 });
    }

    if (file.size > PDF_TO_PPTX_MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "The PDF exceeds the 100 MB conversion limit." }, { status: 413 });
    }

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF file." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (inputBuffer.subarray(0, 4).toString("ascii") !== PDF_SIGNATURE) {
      return NextResponse.json({ success: false, message: "The uploaded file is not a valid PDF." }, { status: 422 });
    }

    if (request.nextUrl.searchParams.get("async") === "1") {
      const jobId = createPdfToPptxJob({
        name: file.name,
        size: file.size,
        type: file.type,
        buffer: inputBuffer,
      });
      return NextResponse.json({ success: true, jobId }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `digidesk-pdf-to-pptx-${crypto.randomUUID()}-`));
    const inputPath = path.join(workingDirectory, "input.pdf");
    await fs.writeFile(inputPath, inputBuffer, { flag: "wx" });
    const result = await pdfToPptx({
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        path: inputPath,
        buffer: inputBuffer,
      },
    });

    if (!result.success || !result.pptx) {
      return NextResponse.json(result, { status: 422 });
    }

    const output = Buffer.from(result.pptx);
    const fileName = result.outputName || pdfToPptxOutputName(file.name);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": PPTX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(output.length),
        "Cache-Control": "no-store",
        "X-PDF-Page-Count": String(result.metadata?.pages ?? 0),
        "X-PPTX-Editable-Text-Objects": String(result.metadata?.editableTextObjects ?? 0),
        "X-PPTX-Editable-Shape-Objects": String(result.metadata?.editableShapeObjects ?? 0),
        "X-PPTX-Native-Table-Objects": String(result.metadata?.nativeTableObjects ?? 0),
        "X-PPTX-Raster-Fallback-Pages": String(result.metadata?.rasterFallbackPages ?? 0),
      },
    });
  } catch (error) {
    console.error("[PDF_TO_PPTX_ROUTE]", error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "PDF to PowerPoint conversion failed.",
    }, { status: 500 });
  } finally {
    if (workingDirectory) {
      await fs.rm(workingDirectory, { recursive: true, force: true }).catch((cleanupError) => {
        console.error("[PDF_TO_PPTX_CLEANUP]", cleanupError);
      });
    }
  }
}

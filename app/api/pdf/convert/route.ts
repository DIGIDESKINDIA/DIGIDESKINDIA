// File: app/api/pdf/convert/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

import {
  officeConverter,
  imageToPDF,
  convertHTMLToPDF,
  convertPDFToImage,
  txtToPDF,
} from "@/lib/pdf";
import { deleteUploadedFile, generateSafeFileName, getUploadPath } from "@/lib/utils/file-upload";

export const runtime = "nodejs";

function safeBaseName(name: string) {
  return (name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._ -]/g, "-").trim() || "document");
}

const SUPPORTED = ["office-to-pdf", "image-to-pdf", "html-to-pdf", "pdf-to-image", "txt-to-pdf"] as const;

type ConversionType = (typeof SUPPORTED)[number];

export async function POST(request: NextRequest) {
  let uploadPath: string | undefined;
  let requestedType = "";
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const type = String(form.get("type")) as ConversionType;
    requestedType = type;

    console.log("[PDF_CONVERT_REQUEST]", "File:", file?.name, "Type:", type, "Size:", file?.size);

    if (!file) {
      return NextResponse.json({ success: false, message: "Input file required." }, { status: 400 });
    }

    if (!SUPPORTED.includes(type)) {
      return NextResponse.json({ success: false, message: "Unsupported conversion." }, { status: 400 });
    }

    if (type === "txt-to-pdf") {
      const maxSize = Number(process.env.TXT_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);
      if (!Number.isFinite(maxSize) || maxSize <= 0) {
        return NextResponse.json({ success: false, message: "TXT upload limit is not configured." }, { status: 500 });
      }
      if (!/\.txt$/i.test(file.name)) {
        return NextResponse.json({ success: false, message: "Only .txt files are supported." }, { status: 400 });
      }
      if (file.size > maxSize) {
        return NextResponse.json({ success: false, message: "The TXT file exceeds the maximum allowed size." }, { status: 413 });
      }
    }

    await fs.mkdir("storage/uploads", { recursive: true });
    uploadPath = getUploadPath(generateSafeFileName(file.name));

    await fs.writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));

    const input = { path: uploadPath, name: file.name, size: file.size };

    switch (type) {
      case "office-to-pdf": {
        const result = await officeConverter({ input, outputFormat: "pdf" });

        if (!result.success || !result.outputPath) {
          const message = result.message?.includes("not configured") || result.message?.includes("not found")
            ? "LibreOffice is not configured on the server."
            : result.message?.includes("PDF") || result.message?.includes("convert")
              ? "The uploaded Excel file could not be converted."
              : "Excel conversion service is unavailable.";

          return NextResponse.json({ success: false, message }, { status: 503 });
        }

        let output: Buffer;
        try {
          output = await fs.readFile(result.outputPath);

          const pdfBytes = new Uint8Array(output);

          return new NextResponse(pdfBytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${safeBaseName(file.name)}.pdf"`,
              "Content-Length": String(pdfBytes.length),
              "Cache-Control": "no-store",
            },
          });
        } finally {
          if (result.outputPath) {
            const workingRoot = path.dirname(path.dirname(result.outputPath));
            await fs.rm(workingRoot, { recursive: true, force: true }).catch(() => undefined);
          }
        }
      }

      case "txt-to-pdf": {
        const bytes = Buffer.from(await fs.readFile(uploadPath));
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          return NextResponse.json({ success: false, message: "The TXT file is not valid UTF-8 text." }, { status: 400 });
        }

        const result = await txtToPDF({ input, outputFormat: "pdf" });
        if (!result.success || !result.outputPath) {
          return NextResponse.json({ success: false, message: "The TXT file could not be converted to PDF." }, { status: 500 });
        }
        try {
          const pdfBytes = new Uint8Array(await fs.readFile(result.outputPath));
          return new NextResponse(pdfBytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${safeBaseName(file.name)}.pdf"`,
              "Content-Length": String(pdfBytes.length),
              "Cache-Control": "no-store",
            },
          });
        } finally {
          await fs.rm(result.outputPath, { force: true }).catch(() => undefined);
        }
      }

      case "image-to-pdf":
        return NextResponse.json(await imageToPDF({ input, outputFormat: "pdf" }));

      case "html-to-pdf":
        {
          const result = await convertHTMLToPDF({ input, outputFormat: "pdf" });
          if (!result.success || !result.outputPath || !result.outputName) {
            const status = result.errorCode === "unsupported-file" || result.errorCode === "empty-file" ? 400
              : result.errorCode === "file-too-large" ? 413
                : result.errorCode === "browser-launch" ? 503 : 500;
            return NextResponse.json({ success: false, message: result.message }, { status });
          }
          try {
            const pdfBytes = new Uint8Array(await fs.readFile(result.outputPath));
            return new NextResponse(pdfBytes, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${result.outputName}"`,
                "Content-Length": String(pdfBytes.length),
                "Cache-Control": "no-store",
              },
            });
          } finally {
            await fs.rm(path.dirname(result.outputPath), { recursive: true, force: true }).catch(() => undefined);
          }
        }

      case "pdf-to-image":
        return NextResponse.json(await convertPDFToImage({ input, outputFormat: "png" }));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("[PDF_CONVERT_ERROR]", {
      message: errorMessage,
      code: error instanceof Error && "code" in error ? error.code : undefined,
      stack: errorStack,
    });

    let userMessage = requestedType === "html-to-pdf" ? "The HTML file could not be converted to PDF." : "Conversion failed. Please try again.";
    if (requestedType !== "html-to-pdf" && (errorMessage.includes("fetch") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("timeout"))) {
      userMessage = "Excel conversion service is unavailable.";
    } else if (requestedType !== "html-to-pdf" && (errorMessage.includes("LibreOffice") || errorMessage.includes("soffice"))) {
      userMessage = "LibreOffice is not configured on the server.";
    } else if (requestedType !== "html-to-pdf" && errorMessage.length > 0 && !errorMessage.includes("fetch")) {
      userMessage = "The uploaded Excel file could not be converted.";
    }

    return NextResponse.json({ success: false, message: userMessage }, { status: 500 });
  } finally {
    if (uploadPath) await deleteUploadedFile(uploadPath);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { AdobeConfigurationError, pdfToImages } from "@/lib/pdf/adobe-services";
import JSZip from "jszip";

export const runtime = "nodejs";

const PDF_WORKER_URL = process.env.PDF_WORKER_URL?.trim();

function providerConfigured() {
  return Boolean(
    process.env.PDF_SERVICES_CLIENT_ID?.trim() &&
      process.env.PDF_SERVICES_CLIENT_SECRET?.trim()
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.type !== "application/pdf" || file.size === 0) {
      return NextResponse.json({ success: false, message: "Please upload a valid PDF." }, { status: 400 });
    }

    const format = String(formData.get("format") ?? "jpg").toLowerCase() === "png" ? "png" : "jpg";
    const source = Buffer.from(await file.arrayBuffer());
    const sourcePdf = await PDFDocument.load(source, { ignoreEncryption: false, updateMetadata: false });
    const pagesRaw = String(formData.get("pages") ?? "").trim();
    const requestedPages = pagesRaw
      ? [...new Set(pagesRaw.split(",").map(Number).filter((page) => Number.isInteger(page) && page >= 1 && page <= sourcePdf.getPageCount()))].sort((a, b) => a - b)
      : [];

    let input = source;
    if (requestedPages.length && requestedPages.length !== sourcePdf.getPageCount()) {
      const selected = await PDFDocument.create();
      const copied = await selected.copyPages(sourcePdf, requestedPages.map((page) => page - 1));
      copied.forEach((page) => selected.addPage(page));
      input = Buffer.from(await selected.save());
    }

    let output: Uint8Array;

    if (PDF_WORKER_URL) {
      const workerForm = new FormData();
      workerForm.append("file", new Blob([input], { type: "application/pdf" }), file.name);
      workerForm.append("format", format);
      let workerResponse: Response;

      try {
        workerResponse = await fetch(`${PDF_WORKER_URL}/render`, {
          method: "POST",
          body: workerForm,
          cache: "no-store",
          signal: AbortSignal.timeout(120000),
        });
      } catch (error) {
        if (!providerConfigured()) {
          return NextResponse.json({
            success: false,
            message: "PDF image conversion requires the configured PDF worker or Adobe PDF credentials.",
          }, { status: 503 });
        }

        throw error;
      }

      if (workerResponse.ok) {
        const rendered = await workerResponse.json() as {
          pages?: Array<{ name: string; bytes: string }>;
        };
        const zip = new JSZip();

        for (const page of rendered.pages ?? []) {
          zip.file(page.name, Buffer.from(page.bytes, "base64"));
        }

        if (!rendered.pages?.length) {
          throw new Error("PDF worker returned no rendered pages.");
        }

        output = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
      } else if (providerConfigured()) {
        output = new Uint8Array(await pdfToImages(input, format));
      } else {
        return NextResponse.json({
          success: false,
          message: await workerResponse.text() || "PDF image conversion is unavailable.",
        }, { status: 503 });
      }
    } else {
      output = new Uint8Array(await pdfToImages(input, format));
    }

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, "")}-images.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const configured = error instanceof AdobeConfigurationError;
    return NextResponse.json({ success: false, message: configured ? error.message : "Unable to convert PDF to images." }, { status: configured ? 503 : 400 });
  }
}

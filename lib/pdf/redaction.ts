import { validateRedactionRectangle, type RedactionRect } from "@/lib/pdf/redaction-utils";

export type { RedactionRect } from "@/lib/pdf/redaction-utils";

export function sanitizeFilename(fileName: string): string {
  const cleanedBase = (fileName || "document")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const safeBase = cleanedBase || "document";
  return `${safeBase}-redacted.pdf`;
}

export { mapViewerToPdf, validateRedactionRectangle } from "@/lib/pdf/redaction-utils";

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const source = await getDocument({ data: pdfBytes, useSystemFonts: true }).promise;
  return source.numPages;
}

export async function applyRedactionsToPdf(
  pdfBytes: Uint8Array,
  redactions: RedactionRect[]
): Promise<Uint8Array> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { PDFDocument, degrees } = await import("pdf-lib");
  const { createCanvas } = await import("@napi-rs/canvas");

  const sourceDocument = await getDocument({ data: pdfBytes, useSystemFonts: true }).promise;
  const outputDocument = await PDFDocument.create();

  for (let pageIndex = 1; pageIndex <= sourceDocument.numPages; pageIndex += 1) {
    const sourcePage = await sourceDocument.getPage(pageIndex);
    const viewport = sourcePage.getViewport({ scale: 2, rotation: sourcePage.rotate ?? 0 });
    const canvas = createCanvas(
      Math.max(1, Math.ceil(viewport.width)),
      Math.max(1, Math.ceil(viewport.height))
    ) as unknown as HTMLCanvasElement & {
      toBuffer: (type: string) => Buffer;
    };
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await sourcePage.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const pageRedactions = redactions.filter((rect) => rect.page === pageIndex);
    if (pageRedactions.length > 0) {
      const pageSize = sourcePage.getViewport({ scale: 1 });
      const xScale = canvas.width / Math.max(pageSize.width, 1);
      const yScale = canvas.height / Math.max(pageSize.height, 1);

      context.fillStyle = "#000000";
      for (const rect of pageRedactions) {
        validateRedactionRectangle(rect, pageSize.width, pageSize.height);
        const drawX = rect.x * xScale;
        const drawY = rect.y * yScale;
        const drawWidth = rect.width * xScale;
        const drawHeight = rect.height * yScale;

        context.fillRect(drawX, drawY, drawWidth, drawHeight);

        if (rect.label) {
          context.fillStyle = "#ffffff";
          context.font = "bold 18px sans-serif";
          context.fillText(rect.label, drawX + 6, drawY + drawHeight - 8);
          context.fillStyle = "#000000";
        }
      }
    }

    const pageImage = await outputDocument.embedPng((canvas as HTMLCanvasElement & { toBuffer: (type: string) => Buffer }).toBuffer("image/png"));
    const newPage = outputDocument.addPage([viewport.width / 2, viewport.height / 2]);
    const rotation = sourcePage.rotate ?? 0;
    if (rotation) {
      newPage.setRotation(degrees(rotation));
    }

    newPage.drawImage(pageImage, {
      x: 0,
      y: 0,
      width: viewport.width / 2,
      height: viewport.height / 2,
    });
  }

  const outputBuffer = Buffer.from(await outputDocument.save({ useObjectStreams: false }));
  return Uint8Array.from(outputBuffer);
}

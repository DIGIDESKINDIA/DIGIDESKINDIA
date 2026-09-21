import crypto from 'node:crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

type FinalizeField = {
  pageIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;
  label?: string;
  type?: string;
  fontSize?: number;
  color?: string;
  imageData?: string;
};

type FinalizeSignedPdfArgs = {
  originalBytes: Uint8Array;
  fields: FinalizeField[];
  pageMap?: Record<string, number>;
};

export async function hashBuffer(buffer: Uint8Array) {
  return crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
}

export async function finalizeSignedPdf({ originalBytes, fields }: FinalizeSignedPdfArgs) {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  for (const field of fields) {
    const pageIndex = Number(field.pageIndex ?? 0);
    const page = pdfDoc.getPages()[pageIndex];
    if (!page) continue;

    const { width, height } = page.getSize();
    const x = Number(field.x ?? 0.1) * width;
    const y = Number(field.y ?? 0.1) * height;
    const drawWidth = Number(field.width ?? 0.2) * width;
    const drawHeight = Number(field.height ?? 0.1) * height;
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textColor = field.color ? field.color : '#0f172a';

    const value = String(field.value ?? field.label ?? 'Signed');
    const rgba = textColor.startsWith('#') ? (() => {
      const hex = textColor.replace('#', '');
      const expanded = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
      const num = Number.parseInt(expanded, 16);
      return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
    })() : rgb(0.06, 0.11, 0.17);

    if (field.type === 'signature' && field.imageData) {
      try {
        const base64 = field.imageData.includes(',') ? field.imageData.split(',')[1] : field.imageData;
        const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
        const isPng = field.imageData.startsWith('data:image/png');
        const embedded = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        page.drawImage(embedded, {
          x,
          y: height - (y + drawHeight),
          width: drawWidth,
          height: drawHeight,
        });
      } catch {
        page.drawText(value, {
          x,
          y: height - (y + drawHeight),
          size: 18,
          font,
          color: rgba,
        });
      }
    } else {
      page.drawText(value, {
        x,
        y: height - (y + drawHeight),
        size: Number(field.fontSize ?? 16),
        font,
        color: rgba,
      });
    }
  }

  const out = await pdfDoc.save();
  const pageSizes = pdfDoc.getPages().map((page) => ({
    width: page.getSize().width,
    height: page.getSize().height,
  }));

  return {
    pdfBytes: out,
    pageCount,
    pageSizes,
    hash: await hashBuffer(out),
  };
}

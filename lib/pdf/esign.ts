import { finalizeSignedPdf } from '@/lib/sign-pdf/finalize-pdf';

export type LegacySignPdfField = {
  type?: string;
  pageIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;
  label?: string;
  color?: string;
  fontSize?: number;
  imageData?: string;
};

export type LegacySignPdfOptions = {
  file: Uint8Array | Buffer | ArrayBuffer | Blob;
  signerName?: string;
  pageNumber?: number;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  fields?: LegacySignPdfField[];
};

async function normalizeFile(file: LegacySignPdfOptions['file']): Promise<Uint8Array> {
  if (file instanceof Uint8Array) return file;
  if (Buffer.isBuffer(file)) return new Uint8Array(file);
  if (file instanceof Blob) {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (file instanceof ArrayBuffer) return new Uint8Array(file);
  return new Uint8Array(Array.from(file as ArrayLike<number>));
}

function normalizeLegacyField(field: LegacySignPdfField, fallbackSignerName?: string): LegacySignPdfField {
  const value = field.value ?? field.label ?? fallbackSignerName ?? 'Signed';
  return {
    type: field.type ?? 'signature',
    pageIndex: Number(field.pageIndex ?? 0),
    x: Number(field.x ?? 0.12),
    y: Number(field.y ?? 0.12),
    width: Number(field.width ?? 0.24),
    height: Number(field.height ?? 0.09),
    value,
    label: field.label ?? 'Signature',
    color: field.color ?? '#0f172a',
    fontSize: Number(field.fontSize ?? 18),
    imageData: field.imageData,
  };
}

export async function signPdf(options: LegacySignPdfOptions) {
  const bytes = await normalizeFile(options.file);

  const fields = Array.isArray(options.fields) && options.fields.length > 0
    ? options.fields.map((field) => normalizeLegacyField(field, options.signerName))
    : [{
        type: 'signature',
        pageIndex: Number(options.pageNumber ?? 1) - 1,
        x: Number(options.x ?? 0.12),
        y: Number(options.y ?? 0.12),
        width: 0.24,
        height: 0.09,
        value: options.signerName ?? 'Signed',
        label: 'Signature',
        color: options.color ?? '#0f172a',
        fontSize: Number(options.size ?? 18),
      }];

  try {
    const finalized = await finalizeSignedPdf({
      originalBytes: bytes,
      fields,
    });

    return {
      success: true,
      message: 'PDF signed successfully.',
      bytes: finalized.pdfBytes,
      hash: finalized.hash,
      pageCount: finalized.pageCount,
      outputName: 'signed-document.pdf',
      statusCode: 200,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to finalize the signed PDF.',
      statusCode: 422,
    };
  }
}

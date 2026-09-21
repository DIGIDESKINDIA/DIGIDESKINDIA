import { NextRequest, NextResponse } from 'next/server';
import { signPdf } from '@/lib/pdf/esign';

export const runtime = 'nodejs';

// Compatibility wrapper: legacy simple e-sign requests are routed through the canonical Sign PDF engine.
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const signerName = String(form.get('signerName') ?? 'Signed');
    const pageNumber = Number(form.get('pageNumber') ?? 1);
    const x = Number(form.get('x') ?? 0.12);
    const y = Number(form.get('y') ?? 0.12);
    const size = Number(form.get('size') ?? 18);
    const color = String(form.get('color') ?? '#0f172a');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'PDF file is required.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, message: 'Please upload a valid PDF file.' }, { status: 400 });
    }

    const result = await signPdf({
      file: new Uint8Array(await file.arrayBuffer()),
      signerName,
      pageNumber,
      x,
      y,
      size,
      color,
    });

    if (!result.success || !result.bytes) {
      return NextResponse.json({ success: false, message: result.message || 'Unable to sign the PDF.' }, { status: result.statusCode || 422 });
    }

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(file.name || 'signed-document.pdf').replace(/\.pdf$/i, '')}-signed.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF_ESIGN_COMPAT]', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unable to sign the PDF.' }, { status: 500 });
  }
}

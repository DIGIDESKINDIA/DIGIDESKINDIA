import { NextRequest, NextResponse } from 'next/server';
import { createDocumentRecordFromFile } from '@/lib/sign-pdf/document-store';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const ownerId = await resolveSigningOwnerId();

    if (!ownerId) {
      return NextResponse.json({ success: false, message: 'Authentication is required to upload signing documents.' }, { status: 401 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'PDF file is required.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, message: 'Only PDF files are supported.' }, { status: 400 });
    }

    const document = await createDocumentRecordFromFile(file, ownerId);
    return NextResponse.json({
      success: true,
      document: {
        id: String(document._id),
        publicDocumentId: document.publicDocumentId,
        originalName: document.originalName,
        filename: document.filename,
        mimeType: document.mimeType,
        size: document.size,
        checksum: document.checksum,
        pageCount: document.metadata?.pageCount ?? 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[SIGN_PDF_DOCUMENT_UPLOAD]', error);
    return NextResponse.json({ success: false, message: 'Unable to save uploaded document.' }, { status: 500 });
  }
}
